/* ============================================================
   RHINE//HOME 后端（MySQL）
   ------------------------------------------------------------
   账号 / 邮箱验证码 / 会话 / 权限树 / 档案内容 / 日志 / 论坛 / 审核 / 上传
   ============================================================ */
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import exifrNamespace from 'exifr'
import { config } from './config.mjs'
import { initSchema, ping, query, execute, transaction } from './db.mjs'
import {
  banActive,
  createSession,
  destroySession,
  hasPermission,
  hashPassword,
  isForumPermission,
  isStaff,
  normalizeUser,
  publicUser,
  pruneSessions,
  roleLabel,
  sanitizePermissions,
  tokenFromRequest,
  userBySession,
  verifyPassword,
} from './auth.mjs'
import { mailConfigured, sendCodeMail } from './mail.mjs'

const exifr = exifrNamespace.default ?? exifrNamespace
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = config.uploadDir
  ? path.resolve(config.uploadDir)
  : path.join(__dirname, 'uploads')
const DIST_DIR = path.resolve(__dirname, '..', 'dist')
const UPLOAD_KINDS = new Set(['file', 'photo', 'video'])

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

/** 数据库可能比 Node 晚启动：带重试地建表，避免开机时后端直接退出 */
async function initDatabaseWithRetry(attempts = 20) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await initSchema()
      return
    } catch (error) {
      lastError = error
      console.error(
        `[db] 连接/建表失败（${attempt}/${attempts}）：${error.message}`,
      )
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
  throw lastError
}

await initDatabaseWithRetry()

// ---------- 基础工具 ----------
const asString = (value, max = 500) => String(value ?? '').trim().slice(0, max)
const asDate = (value) => {
  const text = asString(value, 32)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}
const today = () => new Date().toISOString().slice(0, 10)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[\w-]{3,32}$/
const SLUG_RE = /^[a-z0-9-]{2,64}$/

const asTags = (value) => {
  const list = Array.isArray(value)
    ? value
    : String(value ?? '').split(/[,，\s]+/)
  return [...new Set(list.map((t) => asString(t, 32)).filter(Boolean))].slice(0, 12)
}

/** 读取数据库里的 tags（兼容历史脏数据：数字 / 字符串 / 对象） */
const parseTags = (value) => {
  if (Array.isArray(value)) return value.filter((tag) => typeof tag === 'string')
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((tag) => typeof tag === 'string')
        : []
    } catch {
      return []
    }
  }
  return []
}

const asAttachments = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      type: ['image', 'video', 'file'].includes(item.type) ? item.type : 'file',
      url: asString(item.url, 500),
      name: asString(item.name, 200),
      size: Number(item.size) || 0,
    }))
    .filter(
      (item) =>
        item.url.startsWith('/uploads/') || /^https?:\/\//.test(item.url),
    )
    .slice(0, 16)
}

const asDownloads = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      label: asString(item?.label, 120) || asString(item?.file, 120),
      file: asString(item?.file, 500),
      size: asString(item?.size, 32),
      note: asString(item?.note, 200),
    }))
    .filter((item) => item.file)
    .slice(0, 20)
}

const pageParams = (req, defaultLimit = 12) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || defaultLimit))
  return { page, limit, offset: (page - 1) * limit }
}

// ---------- 限流（内存） ----------
const limits = new Map()
function rateLimit(key, windowMs, max) {
  const now = Date.now()
  const record = limits.get(key)
  if (!record || now > record.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  record.count += 1
  return record.count <= max
}
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of limits) if (now > record.resetAt) limits.delete(key)
}, 5 * 60 * 1000).unref()
setInterval(() => {
  void pruneSessions().catch((error) => console.error('[sessions]', error.message))
}, 60 * 60 * 1000).unref()

// ---------- 中间件 ----------
async function auth(req, _res, next) {
  const user = await userBySession(tokenFromRequest(req))
  if (user && user.status === 'active') req.user = user
  next()
}

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' })
  next()
}

const requireStaff = (req, res, next) => {
  if (req.user && isStaff(req.user)) return next()
  res.status(403).json({ error: 'forbidden' })
}

const requirePermission = (permission) => (req, res, next) => {
  if (req.user && hasPermission(req.user, permission)) return next()
  res.status(403).json({ error: 'forbidden' })
}

const requireMembersManage = (req, res, next) => {
  if (req.user?.isSuper || req.user?.permissions.includes('members.manage')) {
    return next()
  }
  res.status(403).json({ error: 'forbidden' })
}

const requireMembersGrant = (req, res, next) => {
  if (req.user?.isSuper || req.user?.permissions.includes('members.grant')) {
    return next()
  }
  res.status(403).json({ error: 'forbidden' })
}

const requireUserAdmin = (req, res, next) => {
  if (
    req.user?.isSuper ||
    req.user?.permissions.includes('members.manage') ||
    req.user?.permissions.includes('members.grant')
  ) {
    return next()
  }
  res.status(403).json({ error: 'forbidden' })
}

const requireForumAccess = (req, res, next) => {
  if (req.user?.isSuper || req.user?.permissions.some(isForumPermission)) {
    return next()
  }
  res.status(403).json({ error: 'forbidden' })
}

const requireVerifiedEmail = (req, res, next) => {
  if (req.user.isSuper || req.user.emailVerified) return next()
  res.status(403).json({ error: 'email_not_verified' })
}

/** 是否有权管理某个论坛板块（forum 拥有全部板块） */
const canModerateBoard = (user, boardId) =>
  hasPermission(user, `forum.${boardId}`)

/** 非超管不能操作「同样拥有管理权限」的账号 */
function canManageTarget(actor, target) {
  if (target.isSuper) return actor.isSuper
  if (actor.isSuper) return true
  const targetHasManagement =
    target.permissions.includes('members.manage') ||
    target.permissions.includes('members.grant')
  if (targetHasManagement) return false
  return (
    actor.permissions.includes('members.manage') ||
    actor.permissions.includes('members.grant')
  )
}

// ---------- 邮箱验证码 ----------
const codeHash = (code) =>
  crypto.createHash('sha256').update(String(code)).digest('hex')

async function issueCode(email, purpose) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  await execute(
    'INSERT INTO email_codes (email, purpose, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
    [email, purpose, codeHash(code)],
  )
  await sendCodeMail(email, code, purpose)
  return code
}

async function consumeCode(email, purpose, code) {
  const rows = await query(
    `SELECT id FROM email_codes
     WHERE email = ? AND purpose = ? AND code_hash = ?
       AND used_at IS NULL AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [email, purpose, codeHash(code)],
  )
  if (!rows.length) return false
  await execute('UPDATE email_codes SET used_at = NOW() WHERE id = ?', [
    rows[0].id,
  ])
  return true
}

// ---------- 启动：初始化超级管理员 ----------
async function ensureSuperAdmin() {
  const rows = await query('SELECT COUNT(*) AS total FROM users')
  if (Number(rows[0]?.total ?? 0) > 0) return
  if (!config.adminPassword) {
    console.error(
      '[bootstrap] 用户表为空且未设置 ADMIN_PASSWORD，请设置环境变量后重启',
    )
    process.exit(1)
  }
  await execute(
    `INSERT INTO users (username, email, email_verified, password_hash, is_super, permissions)
     VALUES (?, ?, 1, ?, 1, ?)`,
    [
      config.adminUser,
      `${config.adminUser}@localhost`,
      hashPassword(config.adminPassword),
      JSON.stringify([]),
    ],
  )
  console.log(`[bootstrap] 已创建超级管理员 ${config.adminUser}`)
}
await ensureSuperAdmin()

// ---------- Express ----------
const app = express()
app.set('trust proxy', 1)
if (config.corsOrigin) {
  app.use(cors({ origin: config.corsOrigin.split(',').map((s) => s.trim()) }))
}
app.use(compression())
app.use(express.json({ limit: '8mb' }))
app.use(auth)

// ============================================================
// 账号 / 会话
// ============================================================
app.post('/api/auth/email-code', async (req, res) => {
  const email = asString(req.body?.email, 190).toLowerCase()
  const purpose = req.body?.purpose === 'reset' ? 'reset' : 'register'
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (!rateLimit(`code:${email}:${purpose}`, 60 * 1000, 1)) {
    return res.status(429).json({ error: 'too_soon' })
  }
  if (!rateLimit(`code-ip:${req.ip}`, 60 * 60 * 1000, 20)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
  if (purpose === 'register' && existing.length) {
    return res.status(409).json({ error: 'email_taken' })
  }
  if (purpose === 'reset' && !existing.length) {
    return res.status(404).json({ error: 'email_not_found' })
  }
  const code = await issueCode(email, purpose)
  res.json({
    ok: true,
    devCode: !mailConfigured() && config.allowDevCodes ? code : undefined,
  })
})

app.post('/api/auth/register', async (req, res) => {
  const username = asString(req.body?.username, 64)
  const email = asString(req.body?.email, 190).toLowerCase()
  const code = asString(req.body?.code, 12)
  const password = String(req.body?.password ?? '')
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'invalid_username' })
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (password.length < 6) {
    return res.status(400).json({ error: 'password_too_short' })
  }
  const taken = await query(
    'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email],
  )
  if (taken.length) return res.status(409).json({ error: 'account_taken' })
  const blacklisted = await query(
    'SELECT email FROM email_blacklist WHERE email = ? LIMIT 1',
    [email],
  )
  if (blacklisted.length) {
    return res.status(403).json({ error: 'email_blacklisted' })
  }
  if (!(await consumeCode(email, 'register', code))) {
    return res.status(400).json({ error: 'invalid_code' })
  }
  const result = await execute(
    `INSERT INTO users (username, email, email_verified, password_hash, is_super, permissions)
     VALUES (?, ?, 1, ?, 0, '[]')`,
    [username, email, hashPassword(password)],
  )
  const rows = await query('SELECT * FROM users WHERE id = ?', [result.insertId])
  const user = normalizeUser(rows[0])
  const token = await createSession(user.id)
  res.status(201).json({ token, user: publicUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const login = asString(req.body?.username, 190)
  const password = String(req.body?.password ?? '')
  if (!rateLimit(`login:${req.ip}:${login}`, 10 * 60 * 1000, 20)) {
    return res.status(429).json({ error: 'too_many_attempts' })
  }
  const rows = await query(
    'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
    [login, login.toLowerCase()],
  )
  if (
    !rows.length ||
    rows[0].status !== 'active' ||
    !verifyPassword(password, rows[0].password_hash)
  ) {
    return res.status(401).json({ error: 'invalid_credentials' })
  }
  const user = normalizeUser(rows[0])
  if (banActive(user)) {
    const until = user.bannedUntil
      ? new Date(String(user.bannedUntil).replace(' ', 'T'))
      : null
    if (until && until.getTime() <= Date.now()) {
      await execute(
        'UPDATE users SET banned = 0, banned_until = NULL, banned_reason = NULL WHERE id = ?',
        [user.id],
      )
    } else {
      return res.status(403).json({
        error: 'account_banned',
        until: user.bannedUntil,
        reason: user.bannedReason,
      })
    }
  }
  const token = await createSession(user.id)
  res.json({ token, user: publicUser(user) })
})

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await destroySession(tokenFromRequest(req))
  res.json({ ok: true })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

app.post('/api/auth/password/reset', async (req, res) => {
  const email = asString(req.body?.email, 190).toLowerCase()
  const code = asString(req.body?.code, 12)
  const password = String(req.body?.password ?? '')
  if (!EMAIL_RE.test(email) || password.length < 6) {
    return res.status(400).json({ error: 'invalid_input' })
  }
  const rows = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
  if (!rows.length) return res.status(404).json({ error: 'email_not_found' })
  if (!(await consumeCode(email, 'reset', code))) {
    return res.status(400).json({ error: 'invalid_code' })
  }
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [
    hashPassword(password),
    rows[0].id,
  ])
  await execute('DELETE FROM sessions WHERE user_id = ?', [rows[0].id])
  res.json({ ok: true })
})

// ============================================================
// 个人设置（自己的密码）
// ============================================================
app.post('/api/admin/me/password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? '')
  const newPassword = String(req.body?.newPassword ?? '')
  const confirmPassword = String(req.body?.confirmPassword ?? '')
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'password_too_short' })
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'password_mismatch' })
  }
  const rows = await query('SELECT password_hash FROM users WHERE id = ?', [
    req.user.id,
  ])
  if (!verifyPassword(currentPassword, rows[0]?.password_hash)) {
    return res.status(400).json({ error: 'wrong_current_password' })
  }
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [
    hashPassword(newPassword),
    req.user.id,
  ])
  await execute(
    'DELETE FROM sessions WHERE user_id = ? AND token <> ?',
    [req.user.id, tokenFromRequest(req)],
  )
  res.json({ ok: true })
})

// ============================================================
// 成员管理
// ============================================================
app.get('/api/admin/users', requireAuth, requireUserAdmin, async (req, res) => {
  const q = asString(req.query.q, 64)
  const rows = q
    ? await query(
        `SELECT * FROM users
         WHERE username LIKE ? OR email LIKE ?
         ORDER BY id ASC LIMIT 500`,
        [`%${q}%`, `%${q}%`],
      )
    : await query('SELECT * FROM users ORDER BY id ASC LIMIT 500')
  res.json({ users: rows.map(normalizeUser).map(publicUser) })
})

app.post('/api/admin/users', requireAuth, requireMembersManage, async (req, res) => {
  const username = asString(req.body?.username, 64)
  const email = asString(req.body?.email, 190).toLowerCase()
  const password = String(req.body?.password ?? '')
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'invalid_username' })
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (password.length < 6) {
    return res.status(400).json({ error: 'password_too_short' })
  }
  const taken = await query(
    'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email],
  )
  if (taken.length) return res.status(409).json({ error: 'account_taken' })
  let permissions = []
  if (req.user.isSuper || req.user.permissions.includes('members.grant')) {
    permissions = sanitizePermissions(req.body?.permissions, req.user)
  }
  const result = await execute(
    `INSERT INTO users (username, email, email_verified, password_hash, is_super, permissions)
     VALUES (?, ?, 1, ?, 0, ?)`,
    [username, email, hashPassword(password), JSON.stringify(permissions)],
  )
  const rows = await query('SELECT * FROM users WHERE id = ?', [result.insertId])
  res.status(201).json({ user: publicUser(normalizeUser(rows[0])) })
})

app.put('/api/admin/users/:id', requireAuth, requireMembersManage, async (req, res) => {
  const id = Number(req.params.id)
  const targetRows = await query('SELECT * FROM users WHERE id = ?', [id])
  const target = normalizeUser(targetRows[0])
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (id === req.user.id) {
    return res.status(400).json({ error: 'use_self_password_endpoint' })
  }
  if (!canManageTarget(req.user, target)) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const patch = {}
  if (req.body?.email !== undefined) {
    const email = asString(req.body.email, 190).toLowerCase()
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
    const taken = await query(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [email, id],
    )
    if (taken.length) return res.status(409).json({ error: 'email_taken' })
    patch.email = email
  }
  if (req.body?.password) {
    const password = String(req.body.password)
    if (password.length < 6) {
      return res.status(400).json({ error: 'password_too_short' })
    }
    patch.password_hash = hashPassword(password)
  }
  if (req.body?.status && ['active', 'disabled'].includes(req.body.status)) {
    if (target.isSuper) return res.status(403).json({ error: 'forbidden' })
    patch.status = req.body.status
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'nothing_to_update' })
  }
  const columns = Object.keys(patch)
  await execute(
    `UPDATE users SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...columns.map((c) => patch[c]), id],
  )
  const updatedRows = await query('SELECT * FROM users WHERE id = ?', [id])
  res.json({ user: publicUser(normalizeUser(updatedRows[0])) })
})

app.put(
  '/api/admin/users/:id/permissions',
  requireAuth,
  requireMembersGrant,
  async (req, res) => {
    const id = Number(req.params.id)
    if (id === req.user.id) {
      return res.status(400).json({ error: 'cannot_change_own_permissions' })
    }
    const targetRows = await query('SELECT * FROM users WHERE id = ?', [id])
    const target = normalizeUser(targetRows[0])
    if (!target) return res.status(404).json({ error: 'not_found' })
    if (target.isSuper) return res.status(403).json({ error: 'cannot_modify_super' })
    if (!canManageTarget(req.user, target)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    const permissions = sanitizePermissions(req.body?.permissions, req.user)
    await execute('UPDATE users SET permissions = ? WHERE id = ?', [
      JSON.stringify(permissions),
      id,
    ])
    await notify(
      id,
      'permission',
      '你的权限已更新',
      permissions.length ? `当前权限：${permissions.join(' / ')}` : '当前没有管理权限',
      '/profile',
    )
    const updatedRows = await query('SELECT * FROM users WHERE id = ?', [id])
    res.json({ user: publicUser(normalizeUser(updatedRows[0])) })
  },
)

app.delete('/api/admin/users/:id', requireAuth, requireMembersManage, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'cannot_delete_self' })
  const targetRows = await query('SELECT * FROM users WHERE id = ?', [id])
  const target = normalizeUser(targetRows[0])
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (target.isSuper) return res.status(403).json({ error: 'cannot_delete_super' })
  if (!canManageTarget(req.user, target)) {
    return res.status(403).json({ error: 'forbidden' })
  }
  await execute('DELETE FROM sessions WHERE user_id = ?', [id])
  await execute('DELETE FROM users WHERE id = ?', [id])
  res.json({ ok: true })
})

// ============================================================
// 档案内容（文章 / 照片 / 视频 / 日志）
// ============================================================
const articleSanitize = (body) => {
  const markdown = String(body?.markdown ?? '').slice(0, 2 * 1024 * 1024)
  if (!markdown.trim()) return null
  return {
    title: asString(body?.title, 200) || '未命名文章',
    date: asDate(body?.date) || today(),
    tags: asTags(body?.tags),
    markdown,
    downloads: asDownloads(body?.downloads),
  }
}

const logSanitize = (body) => {
  const markdown = String(body?.markdown ?? '').slice(0, 2 * 1024 * 1024)
  if (!markdown.trim()) return null
  return {
    title: asString(body?.title, 200) || '未命名日志',
    date: asDate(body?.date) || today(),
    markdown,
  }
}

const videoSanitize = (body) => {
  const src = asString(body?.src, 500)
  if (!src) return null
  return {
    title: asString(body?.title, 200) || '未命名视频',
    description: String(body?.description ?? '').slice(0, 2000),
    tags: asTags(body?.tags),
    src,
    poster: asString(body?.poster, 500),
  }
}

const photoSanitize = (body) => {
  const url = asString(body?.url, 500)
  if (!url) return null
  return {
    url,
    name: asString(body?.name, 500) || url.split('/').pop() || 'photo',
    date: asDate(body?.date) || '',
    description: asString(body?.description, 300),
  }
}

function toJsonIfNeeded(value) {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : (value ?? '')
}

function mapContentRow(row) {
  const parse = (value) => {
    try {
      return Array.isArray(value) ? value : JSON.parse(value ?? '[]')
    } catch {
      return []
    }
  }
  const mapped = { ...row, id: Number(row.id) }
  if (row.tags !== undefined) mapped.tags = parse(row.tags)
  if (row.downloads !== undefined) mapped.downloads = parse(row.downloads)
  if (row.author_id !== undefined) mapped.authorId = Number(row.author_id)
  if (row.uploaded_by !== undefined) mapped.uploadedBy = Number(row.uploaded_by)
  return mapped
}

function registerContent(name, permission, sanitize, columns, ownerColumn) {
  const base = `/api/admin/${name}`

  app.get(base, requireAuth, requirePermission(permission), async (_req, res) => {
    const rows = await query(`SELECT * FROM ${name} ORDER BY id DESC LIMIT 200`)
    res.json({ items: rows.map(mapContentRow) })
  })

  app.post(base, requireAuth, requirePermission(permission), async (req, res) => {
    const data = sanitize(req.body)
    if (!data) return res.status(400).json({ error: 'invalid_input' })
    const values = columns.map((column) => toJsonIfNeeded(data[column]))
    const result = await execute(
      `INSERT INTO ${name} (${columns.join(', ')}, ${ownerColumn}) VALUES (${columns.map(() => '?').join(', ')}, ?)`,
      [...values, req.user.id],
    )
    const rows = await query(`SELECT * FROM ${name} WHERE id = ?`, [result.insertId])
    res.status(201).json(mapContentRow(rows[0]))
  })

  app.put(base + '/:id', requireAuth, requirePermission(permission), async (req, res) => {
    const data = sanitize(req.body)
    if (!data) return res.status(400).json({ error: 'invalid_input' })
    const values = columns.map((column) => toJsonIfNeeded(data[column]))
    await execute(
      `UPDATE ${name} SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...values, Number(req.params.id)],
    )
    const rows = await query(`SELECT * FROM ${name} WHERE id = ?`, [
      Number(req.params.id),
    ])
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    res.json(mapContentRow(rows[0]))
  })

  app.delete(base + '/:id', requireAuth, requirePermission(permission), async (req, res) => {
    await execute(`DELETE FROM ${name} WHERE id = ?`, [Number(req.params.id)])
    res.json({ ok: true })
  })
}

registerContent('articles', 'archive.articles', articleSanitize, [
  'title',
  'date',
  'tags',
  'markdown',
  'downloads',
], 'author_id')
registerContent('logs', 'logs', logSanitize, ['title', 'date', 'markdown'], 'author_id')
registerContent('photos', 'archive.photos', photoSanitize, ['url', 'name', 'date', 'description'], 'uploaded_by')
registerContent('videos', 'archive.videos', videoSanitize, [
  'title',
  'description',
  'tags',
  'src',
  'poster',
], 'uploaded_by')

// ---------- 公开内容 ----------
app.get('/api/content/articles', async (_req, res) => {
  const rows = await query('SELECT * FROM articles ORDER BY date DESC, id DESC LIMIT 60')
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items: rows.map(mapContentRow) })
})
app.get('/api/content/logs', async (_req, res) => {
  const rows = await query('SELECT * FROM logs ORDER BY date DESC, id DESC LIMIT 60')
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items: rows.map(mapContentRow) })
})
app.get('/api/content/photos', async (_req, res) => {
  const rows = await query('SELECT * FROM photos ORDER BY date DESC, id DESC LIMIT 200')
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items: rows.map(mapContentRow) })
})
app.get('/api/content/videos', async (_req, res) => {
  const rows = await query('SELECT * FROM videos ORDER BY id DESC LIMIT 60')
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items: rows.map(mapContentRow) })
})

// ---------- 留言板 ----------
app.get('/api/messages', async (_req, res) => {
  const rows = await query(
    'SELECT id, name, content, created_at AS createdAt FROM guest_messages ORDER BY id DESC LIMIT 60',
  )
  res.json({ messages: rows })
})
app.post('/api/messages', async (req, res) => {
  const name = asString(req.body?.name, 24)
  const content = asString(req.body?.content, 120)
  if (!name || !content) return res.status(400).json({ error: 'invalid_input' })
  const result = await execute(
    'INSERT INTO guest_messages (name, content) VALUES (?, ?)',
    [name, content],
  )
  res.status(201).json({
    id: Number(result.insertId),
    name,
    content,
    createdAt: new Date().toISOString(),
  })
})

// ============================================================
// 文件上传
// ============================================================
const uploadStorage = multer.diskStorage({
  destination(req, _file, callback) {
    const kind = UPLOAD_KINDS.has(String(req.query.kind)) ? String(req.query.kind) : 'file'
    const folder = path.join(UPLOAD_DIR, kind)
    fs.mkdirSync(folder, { recursive: true })
    callback(null, folder)
  },
  filename(_req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10)
    callback(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`)
  },
})
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
})

async function readPhotoDate(filePath, originalName) {
  try {
    const buffer = await fsp.readFile(filePath)
    const data = await exifr.parse(buffer, ['DateTimeOriginal', 'CreateDate'])
    const raw = data?.DateTimeOriginal ?? data?.CreateDate
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      return raw.toISOString().slice(0, 10)
    }
  } catch {
    /* 无 EXIF */
  }
  const matched = /(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})/.exec(originalName)
  return matched ? `${matched[1]}-${matched[2]}-${matched[3]}` : null
}

app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' })
  const kind = UPLOAD_KINDS.has(String(req.query.kind))
    ? String(req.query.kind)
    : 'file'
  const url = `/uploads/${kind}/${req.file.filename}`
  const date =
    kind === 'photo' ? await readPhotoDate(req.file.path, req.file.originalname) : null
  res.json({ url, name: req.file.originalname, size: req.file.size, date })
})

// ============================================================
// 论坛（公开读取）
// ============================================================
const boardPublic = (row) => ({
  id: Number(row.id),
  slug: row.slug,
  name: row.name,
  description: row.description ?? '',
  access: row.access ?? 'public',
  sort: Number(row.sort),
  postCount: Number(row.post_count ?? 0),
  lastPostAt: row.last_post_at ?? null,
})

/** 论坛访问控制：public 所有人；special 需授权或申请通过；core 仅超管/对应权限 */
async function canAccessBoard(user, board) {
  const access = board.access ?? 'public'
  if (access === 'public') return true
  if (!user) return false
  if (user.isSuper) return true
  if (hasPermission(user, `forum.${board.id}`)) return true
  if (access === 'special') {
    const rows = await query(
      `SELECT id FROM forum_access_requests
       WHERE board_id = ? AND user_id = ? AND status = 'approved' LIMIT 1`,
      [board.id, user.id],
    )
    return rows.length > 0
  }
  return false
}

app.get('/api/forum/boards', async (req, res) => {
  const rows = await query(
    `SELECT b.*,
      (SELECT COUNT(*) FROM forum_posts p WHERE p.board_id = b.id AND p.status = 'approved') AS post_count,
      (SELECT MAX(p.created_at) FROM forum_posts p WHERE p.board_id = b.id AND p.status = 'approved') AS last_post_at
     FROM forum_boards b ORDER BY b.sort ASC, b.id ASC`,
  )
  const boards = []
  for (const row of rows) {
    const board = boardPublic(row)
    const canAccess = await canAccessBoard(req.user, board)
    let requestStatus = ''
    if (req.user && board.access === 'special') {
      const requests = await query(
        `SELECT status FROM forum_access_requests
         WHERE board_id = ? AND user_id = ? LIMIT 1`,
        [board.id, req.user.id],
      )
      requestStatus = requests[0]?.status ?? ''
    }
    boards.push({ ...board, canAccess, requestStatus })
  }
  res.json({ boards })
})

app.get('/api/forum/announcements', async (req, res) => {
  const boardId = Number(req.query.boardId) || null
  const rows = await query(
    `SELECT a.*, u.username AS author
     FROM announcements a JOIN users u ON u.id = a.author_id
     WHERE a.board_id IS NULL${boardId ? ' OR a.board_id = ?' : ''}
     ORDER BY a.created_at DESC LIMIT 12`,
    boardId ? [boardId] : [],
  )
  res.json({
    announcements: rows.map((row) => ({
      id: Number(row.id),
      boardId: row.board_id ? Number(row.board_id) : null,
      title: row.title,
      content: row.content,
      author: row.author,
      createdAt: row.created_at,
    })),
  })
})

app.get('/api/forum/boards/:slug', async (req, res) => {
  const slug = asString(req.params.slug, 64)
  const boards = await query('SELECT * FROM forum_boards WHERE slug = ? LIMIT 1', [slug])
  if (!boards.length) return res.status(404).json({ error: 'not_found' })
  const board = boards[0]
  if (!(await canAccessBoard(req.user, board))) {
    return res.status(403).json({
      error: 'board_forbidden',
      board: {
        id: Number(board.id),
        slug: board.slug,
        name: board.name,
        access: board.access,
      },
    })
  }
  const { page, limit, offset } = pageParams(req)
  const totalRows = await query(
    `SELECT COUNT(*) AS total FROM forum_posts WHERE board_id = ? AND status = 'approved'`,
    [board.id],
  )
  const posts = await query(
    `SELECT p.id, p.title, p.created_at, p.updated_at, p.tags, p.pinned,
            u.username AS author, u.id AS author_id, u.avatar_url AS author_avatar,
            (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id AND r.status = 'approved') AS reply_count
     FROM forum_posts p JOIN users u ON u.id = p.author_id
     WHERE p.board_id = ? AND p.status = 'approved'
     ORDER BY p.pinned DESC, p.created_at DESC LIMIT ? OFFSET ?`,
    [board.id, limit, offset],
  )
  res.json({
    board: boardPublic({ ...board, post_count: totalRows[0].total }),
    posts: posts.map((p) => ({
      id: Number(p.id),
      title: p.title,
      author: p.author,
      authorId: Number(p.author_id),
      authorAvatar: p.author_avatar ?? '',
      tags: parseTags(p.tags),
      pinned: Boolean(p.pinned),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      replyCount: Number(p.reply_count),
    })),
    pagination: { page, limit, total: Number(totalRows[0].total) },
  })
})

app.get('/api/forum/posts/:id', async (req, res) => {
  const id = Number(req.params.id)
  const rows = await query(
    `SELECT p.*, u.username AS author, u.avatar_url AS author_avatar,
            b.slug AS board_slug, b.name AS board_name
     FROM forum_posts p
     JOIN users u ON u.id = p.author_id
     JOIN forum_boards b ON b.id = p.board_id
     WHERE p.id = ? AND p.status = 'approved' LIMIT 1`,
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const post = rows[0]
  const replies = await query(
    `SELECT r.*, u.username AS author, u.avatar_url AS author_avatar
     FROM forum_replies r JOIN users u ON u.id = r.author_id
     WHERE r.post_id = ? AND r.status = 'approved'
     ORDER BY r.created_at ASC LIMIT 300`,
    [id],
  )
  res.json({
    post: {
      id: Number(post.id),
      title: post.title,
      content: post.content,
      attachments: asAttachments(post.attachments),
      tags: parseTags(post.tags),
      pinned: Boolean(post.pinned),
      author: post.author,
      authorAvatar: post.author_avatar ?? '',
      authorId: Number(post.author_id),
      board: { id: Number(post.board_id), slug: post.board_slug, name: post.board_name },
      createdAt: post.created_at,
    },
    replies: replies.map((r) => ({
      id: Number(r.id),
      parentId: r.parent_id ? Number(r.parent_id) : null,
      content: r.content,
      attachments: asAttachments(r.attachments),
      author: r.author,
      authorAvatar: r.author_avatar ?? '',
      authorId: Number(r.author_id),
      createdAt: r.created_at,
    })),
  })
})

app.get('/api/forum/my', requireAuth, async (req, res) => {
  const posts = await query(
    `SELECT p.id, p.title, p.status, p.created_at, b.slug AS board_slug, b.name AS board_name
     FROM forum_posts p JOIN forum_boards b ON b.id = p.board_id
     WHERE p.author_id = ? ORDER BY p.id DESC LIMIT 50`,
    [req.user.id],
  )
  const replies = await query(
    `SELECT r.id, r.content, r.status, r.created_at, p.title AS post_title, p.id AS post_id
     FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id
     WHERE r.author_id = ? ORDER BY r.id DESC LIMIT 50`,
    [req.user.id],
  )
  res.json({
    posts: posts.map((p) => ({
      id: Number(p.id),
      title: p.title,
      status: p.status,
      createdAt: p.created_at,
      board: { slug: p.board_slug, name: p.board_name },
    })),
    replies: replies.map((r) => ({
      id: Number(r.id),
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
      post: { id: Number(r.post_id), title: r.post_title },
    })),
  })
})

async function notify(userId, type, title, content, link) {
  try {
    await execute(
      `INSERT INTO notifications (user_id, type, title, content, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, title, asString(content, 500), asString(link, 300)],
    )
  } catch (error) {
    console.error('[notify]', error.message)
  }
}

app.post('/api/forum/posts', requireAuth, requireVerifiedEmail, async (req, res) => {
  const boardId = Number(req.body?.boardId)
  const title = asString(req.body?.title, 200)
  const content = String(req.body?.content ?? '').slice(0, 200000)
  const attachments = asAttachments(req.body?.attachments)
  const tags = asTags(req.body?.tags)
  if (!title || !content.trim()) {
    return res.status(400).json({ error: 'invalid_input' })
  }
  const boards = await query(
    'SELECT id, access FROM forum_boards WHERE id = ?',
    [boardId],
  )
  if (!boards.length) return res.status(400).json({ error: 'invalid_board' })
  if (!(await canAccessBoard(req.user, boards[0]))) {
    return res.status(403).json({ error: 'board_forbidden' })
  }
  if (!rateLimit(`post:${req.user.id}`, 60 * 1000, 5)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  const autoApprove = canModerateBoard(req.user, boardId)
  const result = await execute(
    `INSERT INTO forum_posts (board_id, author_id, title, content, attachments, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      boardId,
      req.user.id,
      title,
      content,
      JSON.stringify(attachments),
      JSON.stringify(tags),
      autoApprove ? 'approved' : 'pending',
    ],
  )
  res.status(201).json({
    id: Number(result.insertId),
    status: autoApprove ? 'approved' : 'pending',
    message: autoApprove ? '帖子已发布' : '已提交，等待论坛管理员审核',
  })
})

app.post(
  '/api/forum/posts/:id/replies',
  requireAuth,
  requireVerifiedEmail,
  async (req, res) => {
    const postId = Number(req.params.id)
    const content = String(req.body?.content ?? '').slice(0, 20000)
    const parentId = Number(req.body?.parentId) || null
    // 回复只允许图片 / GIF 表情；不允许视频与文件
    const attachments = asAttachments(req.body?.attachments).filter(
      (item) =>
        item.type === 'image' &&
        item.size <= 30 * 1024 * 1024 &&
        (item.url.startsWith('/uploads/photo/') || /^https?:\/\//.test(item.url)),
    )
    if (!content.trim() && attachments.length === 0) {
      return res.status(400).json({ error: 'invalid_input' })
    }
    const posts = await query(
      `SELECT id, author_id, board_id FROM forum_posts
       WHERE id = ? AND status = 'approved' LIMIT 1`,
      [postId],
    )
    if (!posts.length) return res.status(404).json({ error: 'post_not_found' })
    let validParent = null
    if (parentId) {
      const parents = await query(
        `SELECT id FROM forum_replies WHERE id = ? AND post_id = ? AND status = 'approved'`,
        [parentId, postId],
      )
      if (parents.length) validParent = parentId
    }
    if (!rateLimit(`reply:${req.user.id}`, 60 * 1000, 10)) {
      return res.status(429).json({ error: 'too_many_requests' })
    }
    const result = await execute(
      `INSERT INTO forum_replies (post_id, author_id, parent_id, content, attachments, status)
       VALUES (?, ?, ?, ?, ?, 'approved')`,
      [postId, req.user.id, validParent, content, JSON.stringify(attachments)],
    )
    if (posts[0].author_id !== req.user.id) {
      await notify(
        posts[0].author_id,
        'reply',
        '你的帖子收到新回复',
        `${req.user.username}：${content.slice(0, 80) || '[图片]'}`,
        `/forum/post/${postId}`,
      )
    }
    res.status(201).json({
      id: Number(result.insertId),
      status: 'approved',
      message: '回复已发布',
    })
  },
)

/** 帖主 / 版主删除帖子（软删除，管理员后台仍可见） */
app.delete('/api/forum/posts/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const rows = await query(
    'SELECT id, author_id, board_id FROM forum_posts WHERE id = ?',
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const allowed =
    rows[0].author_id === req.user.id ||
    canModerateBoard(req.user, Number(rows[0].board_id))
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  await execute(`UPDATE forum_posts SET status = 'deleted' WHERE id = ?`, [id])
  res.json({ ok: true })
})

/** 版主操作：隐藏 / 恢复 / 置顶 / 取消置顶 / 删除 */
app.post(
  '/api/admin/forum/posts/:id/moderate',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const id = Number(req.params.id)
    const action = asString(req.body?.action, 20)
    const rows = await query(
      'SELECT id, board_id, status FROM forum_posts WHERE id = ?',
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    if (!canModerateBoard(req.user, Number(rows[0].board_id))) {
      return res.status(403).json({ error: 'forbidden' })
    }
    if (action === 'hide') {
      await execute(`UPDATE forum_posts SET status = 'hidden' WHERE id = ?`, [id])
    } else if (action === 'restore') {
      await execute(`UPDATE forum_posts SET status = 'approved' WHERE id = ?`, [id])
    } else if (action === 'pin') {
      await execute('UPDATE forum_posts SET pinned = 1 WHERE id = ?', [id])
    } else if (action === 'unpin') {
      await execute('UPDATE forum_posts SET pinned = 0 WHERE id = ?', [id])
    } else if (action === 'delete') {
      await execute(`UPDATE forum_posts SET status = 'deleted' WHERE id = ?`, [id])
    } else {
      return res.status(400).json({ error: 'invalid_action' })
    }
    res.json({ ok: true })
  },
)

/** 回复删除：回复作者 / 帖主 / 版主 */
app.delete('/api/forum/replies/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const rows = await query(
    `SELECT r.id, r.author_id, p.author_id AS post_author, p.board_id
     FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id
     WHERE r.id = ?`,
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const row = rows[0]
  const allowed =
    row.author_id === req.user.id ||
    row.post_author === req.user.id ||
    canModerateBoard(req.user, Number(row.board_id))
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  await execute(`UPDATE forum_replies SET status = 'deleted' WHERE id = ?`, [id])
  res.json({ ok: true })
})

// ============================================================
// 后台：论坛管理 + 审核
// ============================================================
app.get('/api/admin/forum/boards', requireAuth, requireForumAccess, async (req, res) => {
  const rows = await query(
    `SELECT b.*,
      (SELECT COUNT(*) FROM forum_posts p WHERE p.board_id = b.id) AS post_count,
      (SELECT COUNT(*) FROM forum_posts p WHERE p.board_id = b.id AND p.status = 'pending') AS pending_count
     FROM forum_boards b ORDER BY b.sort ASC, b.id ASC`,
  )
  res.json({
    boards: rows.map((row) => ({
      ...boardPublic(row),
      pendingCount: Number(row.pending_count ?? 0),
      canModerate: canModerateBoard(req.user, Number(row.id)),
    })),
  })
})

app.post('/api/admin/forum/boards', requireAuth, requireForumAccess, async (req, res) => {
  if (!(req.user.isSuper || hasPermission(req.user, 'forum'))) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const name = asString(req.body?.name, 100)
  const slug = asString(req.body?.slug, 64).toLowerCase()
  const description = asString(req.body?.description, 500)
  const sort = Number(req.body?.sort) || 0
  const access = ['public', 'special', 'core'].includes(req.body?.access)
    ? req.body.access
    : 'public'
  if (!name || !SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'invalid_input' })
  }
  const exists = await query('SELECT id FROM forum_boards WHERE slug = ?', [slug])
  if (exists.length) return res.status(409).json({ error: 'slug_taken' })
  const result = await execute(
    'INSERT INTO forum_boards (slug, name, description, access, sort) VALUES (?, ?, ?, ?, ?)',
    [slug, name, description, access, sort],
  )
  res.status(201).json({ id: Number(result.insertId) })
})

app.put('/api/admin/forum/boards/:id', requireAuth, requireForumAccess, async (req, res) => {
  if (!(req.user.isSuper || hasPermission(req.user, 'forum'))) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const id = Number(req.params.id)
  const patch = {}
  if (req.body?.name !== undefined) patch.name = asString(req.body.name, 100)
  if (req.body?.slug !== undefined) patch.slug = asString(req.body.slug, 64).toLowerCase()
  if (req.body?.description !== undefined) patch.description = asString(req.body.description, 500)
  if (req.body?.sort !== undefined) patch.sort = Number(req.body.sort) || 0
  if (req.body?.access !== undefined) {
    if (!['public', 'special', 'core'].includes(req.body.access)) {
      return res.status(400).json({ error: 'invalid_access' })
    }
    patch.access = req.body.access
  }
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing_to_update' })
  if (patch.slug && !SLUG_RE.test(patch.slug)) {
    return res.status(400).json({ error: 'invalid_slug' })
  }
  const columns = Object.keys(patch)
  await execute(
    `UPDATE forum_boards SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...columns.map((c) => patch[c]), id],
  )
  res.json({ ok: true })
})

app.delete('/api/admin/forum/boards/:id', requireAuth, requireForumAccess, async (req, res) => {
  if (!(req.user.isSuper || hasPermission(req.user, 'forum'))) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const id = Number(req.params.id)
  await transaction(async (connection) => {
    await connection.execute(
      'DELETE r FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id WHERE p.board_id = ?',
      [id],
    )
    await connection.execute('DELETE FROM forum_posts WHERE board_id = ?', [id])
    await connection.execute('DELETE FROM forum_boards WHERE id = ?', [id])
  })
  res.json({ ok: true })
})

app.get('/api/admin/forum/pending', requireAuth, requireForumAccess, async (req, res) => {
  const { page, limit, offset } = pageParams(req, 20)
  const posts = await query(
    `SELECT p.id, p.title, p.content, p.attachments, p.created_at,
            p.board_id, b.name AS board_name, u.username AS author
     FROM forum_posts p
     JOIN forum_boards b ON b.id = p.board_id
     JOIN users u ON u.id = p.author_id
     WHERE p.status = 'pending' ORDER BY p.id ASC LIMIT ? OFFSET ?`,
    [limit, offset],
  )
  const replies = await query(
    `SELECT r.id, r.content, r.attachments, r.created_at,
            r.post_id, p.title AS post_title, p.board_id, b.name AS board_name, u.username AS author
     FROM forum_replies r
     JOIN forum_posts p ON p.id = r.post_id
     JOIN forum_boards b ON b.id = p.board_id
     JOIN users u ON u.id = r.author_id
     WHERE r.status = 'pending' ORDER BY r.id ASC LIMIT ? OFFSET ?`,
    [limit, offset],
  )
  res.json({
    posts: posts
      .filter((p) => canModerateBoard(req.user, Number(p.board_id)))
      .map((p) => ({
        id: Number(p.id),
        title: p.title,
        content: p.content,
        attachments: asAttachments(p.attachments),
        boardId: Number(p.board_id),
        boardName: p.board_name,
        author: p.author,
        createdAt: p.created_at,
      })),
    replies: replies
      .filter((r) => canModerateBoard(req.user, Number(r.board_id)))
      .map((r) => ({
        id: Number(r.id),
        content: r.content,
        attachments: asAttachments(r.attachments),
        postId: Number(r.post_id),
        postTitle: r.post_title,
        boardName: r.board_name,
        author: r.author,
        createdAt: r.created_at,
      })),
    pagination: { page, limit },
  })
})

app.post('/api/admin/forum/review', requireAuth, requireForumAccess, async (req, res) => {
  const type = req.body?.type === 'reply' ? 'reply' : 'post'
  const id = Number(req.body?.id)
  const approve = req.body?.approve === true
  const note = asString(req.body?.note, 255)
  let boardId = null
  if (type === 'post') {
    const rows = await query(
      'SELECT board_id, author_id, title FROM forum_posts WHERE id = ?',
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    boardId = Number(rows[0].board_id)
    if (!canModerateBoard(req.user, boardId)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    await execute(
      `UPDATE forum_posts SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [approve ? 'approved' : 'rejected', note, req.user.id, id],
    )
    if (Number(rows[0].author_id) !== req.user.id) {
      await notify(
        Number(rows[0].author_id),
        'review',
        approve ? '帖子已通过审核' : '帖子未通过审核',
        note || rows[0].title,
        `/forum/post/${id}`,
      )
    }
  } else {
    const rows = await query(
      `SELECT p.board_id FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id WHERE r.id = ?`,
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    boardId = Number(rows[0].board_id)
    if (!canModerateBoard(req.user, boardId)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    await execute(
      `UPDATE forum_replies SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [approve ? 'approved' : 'rejected', note, req.user.id, id],
    )
  }
  res.json({ ok: true })
})

// ============================================================
// 后台：板块内帖子管理
// ============================================================
app.get(
  '/api/admin/forum/boards/:id/posts',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const boardId = Number(req.params.id)
    if (!canModerateBoard(req.user, boardId)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    const { page, limit, offset } = pageParams(req, 30)
    const rows = await query(
      `SELECT p.id, p.title, p.status, p.pinned, p.created_at, p.updated_at,
              u.username AS author,
              (SELECT COUNT(*) FROM forum_replies r
               WHERE r.post_id = p.id AND r.status = 'approved') AS reply_count
       FROM forum_posts p JOIN users u ON u.id = p.author_id
       WHERE p.board_id = ?
       ORDER BY p.pinned DESC, p.created_at DESC LIMIT ? OFFSET ?`,
      [boardId, limit, offset],
    )
    res.json({
      posts: rows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        status: row.status,
        pinned: Boolean(row.pinned),
        author: row.author,
        replyCount: Number(row.reply_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      pagination: { page, limit },
    })
  },
)

// ============================================================
// 论坛公告（仅论坛管理权限）
// ============================================================
app.post(
  '/api/admin/forum/announcements',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const boardId = Number(req.body?.boardId) || null
    const allowed = boardId
      ? canModerateBoard(req.user, boardId)
      : req.user.isSuper || hasPermission(req.user, 'forum')
    if (!allowed) {
      return res.status(403).json({ error: 'forbidden' })
    }
    const title = asString(req.body?.title, 200)
    const content = String(req.body?.content ?? '').slice(0, 5000)
    if (!title || !content.trim()) {
      return res.status(400).json({ error: 'invalid_input' })
    }
    if (boardId) {
      const boards = await query('SELECT id FROM forum_boards WHERE id = ?', [boardId])
      if (!boards.length) return res.status(400).json({ error: 'invalid_board' })
    }
    const result = await execute(
      'INSERT INTO announcements (board_id, title, content, author_id) VALUES (?, ?, ?, ?)',
      [boardId, title, content, req.user.id],
    )
    res.status(201).json({ id: Number(result.insertId) })
  },
)

app.delete(
  '/api/admin/forum/announcements/:id',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    if (!(req.user.isSuper || hasPermission(req.user, 'forum'))) {
      return res.status(403).json({ error: 'forbidden' })
    }
    const rows = await query('SELECT board_id FROM announcements WHERE id = ?', [
      Number(req.params.id),
    ])
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    if (rows[0].board_id && !canModerateBoard(req.user, Number(rows[0].board_id))) {
      return res.status(403).json({ error: 'forbidden' })
    }
    await execute('DELETE FROM announcements WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  },
)

app.get(
  '/api/admin/forum/posts/:id',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const id = Number(req.params.id)
    const rows = await query(
      `SELECT p.*, b.name AS board_name, u.username AS author
       FROM forum_posts p
       JOIN forum_boards b ON b.id = p.board_id
       JOIN users u ON u.id = p.author_id
       WHERE p.id = ?`,
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    const post = rows[0]
    if (!canModerateBoard(req.user, Number(post.board_id))) {
      return res.status(403).json({ error: 'forbidden' })
    }
    res.json({
      post: {
        id: Number(post.id),
        title: post.title,
        content: post.content,
        attachments: asAttachments(post.attachments),
        tags: parseTags(post.tags),
        pinned: Boolean(post.pinned),
        status: post.status,
        boardName: post.board_name,
        author: post.author,
        createdAt: post.created_at,
      },
    })
  },
)

// ============================================================
// 特殊论坛访问申请
// ============================================================
app.post('/api/forum/boards/:id/request', requireAuth, async (req, res) => {
  const boardId = Number(req.params.id)
  const rows = await query('SELECT * FROM forum_boards WHERE id = ?', [boardId])
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const board = rows[0]
  if (board.access !== 'special') {
    return res.status(400).json({ error: 'not_required' })
  }
  if (await canAccessBoard(req.user, board)) {
    return res.status(400).json({ error: 'already_has_access' })
  }
  const existing = await query(
    'SELECT status FROM forum_access_requests WHERE board_id = ? AND user_id = ? LIMIT 1',
    [boardId, req.user.id],
  )
  if (existing[0]?.status === 'approved') return res.json({ status: 'approved' })
  if (existing[0]?.status === 'pending') return res.json({ status: 'pending' })
  await execute(
    `INSERT INTO forum_access_requests (board_id, user_id, status)
     VALUES (?, ?, 'pending')
     ON DUPLICATE KEY UPDATE status = 'pending', reviewed_by = NULL, reviewed_at = NULL`,
    [boardId, req.user.id],
  )
  // 通知板块管理员与超级管理员
  const moderators = await query(
    `SELECT id FROM users
     WHERE is_super = 1
        OR JSON_CONTAINS(permissions, JSON_QUOTE('forum'))
        OR JSON_CONTAINS(permissions, JSON_QUOTE(?))`,
    [`forum.${boardId}`],
  ).catch(() => [])
  for (const moderator of moderators) {
    if (Number(moderator.id) !== req.user.id) {
      await notify(
        Number(moderator.id),
        'access',
        '新的论坛访问申请',
        `${req.user.username} 申请访问「${board.name}」`,
        '/admin',
      )
    }
  }
  res.status(201).json({ status: 'pending' })
})

app.get('/api/admin/forum/requests', requireAuth, requireForumAccess, async (req, res) => {
  const rows = await query(
    `SELECT r.*, b.name AS board_name, b.access, u.username
     FROM forum_access_requests r
     JOIN forum_boards b ON b.id = r.board_id
     JOIN users u ON u.id = r.user_id
     ORDER BY r.id DESC LIMIT 200`,
  )
  res.json({
    requests: rows
      .filter((row) => canModerateBoard(req.user, Number(row.board_id)))
      .map((row) => ({
        id: Number(row.id),
        boardId: Number(row.board_id),
        boardName: row.board_name,
        access: row.access,
        userId: Number(row.user_id),
        username: row.username,
        status: row.status,
        createdAt: row.created_at,
      })),
  })
})

app.post(
  '/api/admin/forum/requests/:id/review',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const id = Number(req.params.id)
    const approve = req.body?.approve === true
    const rows = await query(
      `SELECT r.*, b.name AS board_name
       FROM forum_access_requests r JOIN forum_boards b ON b.id = r.board_id
       WHERE r.id = ?`,
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    if (!canModerateBoard(req.user, Number(rows[0].board_id))) {
      return res.status(403).json({ error: 'forbidden' })
    }
    await execute(
      `UPDATE forum_access_requests
       SET status = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [approve ? 'approved' : 'rejected', req.user.id, id],
    )
    await notify(
      Number(rows[0].user_id),
      'access',
      approve ? '论坛访问申请已通过' : '论坛访问申请未通过',
      `「${rows[0].board_name}」`,
      `/forum`,
    )
    res.json({ ok: true })
  },
)

// ============================================================
// 封禁 / 解封（临时或永久拉黑邮箱）
// ============================================================
app.post('/api/admin/users/:id/ban', requireAuth, requireMembersManage, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'cannot_ban_self' })
  const targetRows = await query('SELECT * FROM users WHERE id = ?', [id])
  const target = normalizeUser(targetRows[0])
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (target.isSuper) return res.status(403).json({ error: 'cannot_ban_super' })
  if (!canManageTarget(req.user, target)) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const permanent = req.body?.permanent === true
  const days = Number(req.body?.days)
  const reason = asString(req.body?.reason, 200)
  if (permanent) {
    await execute(
      `UPDATE users SET banned = 1, banned_until = NULL, banned_reason = ? WHERE id = ?`,
      [reason, id],
    )
    await execute(
      `INSERT INTO email_blacklist (email, reason) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE reason = ?`,
      [target.email, reason, reason],
    )
  } else {
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return res.status(400).json({ error: 'invalid_days' })
    }
    await execute(
      `UPDATE users SET banned = 1, banned_until = DATE_ADD(NOW(), INTERVAL ? DAY), banned_reason = ?
       WHERE id = ?`,
      [Math.floor(days), reason, id],
    )
  }
  await execute('DELETE FROM sessions WHERE user_id = ?', [id])
  await notify(
    id,
    'ban',
    permanent ? '账号已被永久封禁' : '账号已被封禁',
    reason || (permanent ? '邮箱已加入黑名单' : `封禁 ${days} 天`),
    '/profile',
  )
  res.json({ ok: true })
})

app.delete('/api/admin/users/:id/ban', requireAuth, requireMembersManage, async (req, res) => {
  const id = Number(req.params.id)
  const targetRows = await query('SELECT * FROM users WHERE id = ?', [id])
  const target = normalizeUser(targetRows[0])
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (!canManageTarget(req.user, target)) {
    return res.status(403).json({ error: 'forbidden' })
  }
  await execute(
    'UPDATE users SET banned = 0, banned_until = NULL, banned_reason = NULL WHERE id = ?',
    [id],
  )
  await execute('DELETE FROM email_blacklist WHERE email = ?', [target.email])
  res.json({ ok: true })
})

// ============================================================
// 通知中心
// ============================================================
app.get('/api/notifications', requireAuth, async (req, res) => {
  const rows = await query(
    `SELECT id, type, title, content, link, read_at, created_at
     FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    [req.user.id],
  )
  const unreadRows = await query(
    'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [req.user.id],
  )
  res.json({
    notifications: rows.map((row) => ({
      id: Number(row.id),
      type: row.type,
      title: row.title,
      content: row.content ?? '',
      link: row.link ?? '',
      read: Boolean(row.read_at),
      createdAt: row.created_at,
    })),
    unread: Number(unreadRows[0].n),
  })
})

app.post('/api/notifications/read', requireAuth, async (req, res) => {
  const id = Number(req.body?.id) || null
  if (id) {
    await execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
      [id, req.user.id],
    )
  } else {
    await execute(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [req.user.id],
    )
  }
  res.json({ ok: true })
})

// ============================================================
// 私信
// ============================================================
app.get('/api/messages/conversations', requireAuth, async (req, res) => {
  const userId = req.user.id
  const rows = await query(
    `SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
            MAX(id) AS last_id
     FROM direct_messages
     WHERE sender_id = ? OR receiver_id = ?
     GROUP BY other_id ORDER BY last_id DESC LIMIT 50`,
    [userId, userId, userId],
  )
  const conversations = []
  for (const row of rows) {
    const otherId = Number(row.other_id)
    const users = await query('SELECT id, username, avatar_url FROM users WHERE id = ?', [
      otherId,
    ])
    if (!users.length) continue
    const last = await query(
      'SELECT id, sender_id, content, created_at FROM direct_messages WHERE id = ?',
      [row.last_id],
    )
    const unread = await query(
      `SELECT COUNT(*) AS n FROM direct_messages
       WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL`,
      [userId, otherId],
    )
    conversations.push({
      user: {
        id: otherId,
        username: users[0].username,
        avatarUrl: users[0].avatar_url ?? '',
      },
      last: last.length
        ? {
            content: last[0].content.slice(0, 80),
            createdAt: last[0].created_at,
            fromMe: Number(last[0].sender_id) === userId,
          }
        : null,
      unread: Number(unread[0].n),
    })
  }
  res.json({ conversations })
})

app.get('/api/messages/with/:id', requireAuth, async (req, res) => {
  const otherId = Number(req.params.id)
  if (!otherId) return res.status(400).json({ error: 'invalid_input' })
  const users = await query('SELECT id, username, avatar_url FROM users WHERE id = ?', [
    otherId,
  ])
  if (!users.length) return res.status(404).json({ error: 'not_found' })
  const messages = await query(
    `SELECT id, sender_id, content, created_at
     FROM direct_messages
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
     ORDER BY id ASC LIMIT 200`,
    [req.user.id, otherId, otherId, req.user.id],
  )
  await execute(
    'UPDATE direct_messages SET read_at = NOW() WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL',
    [req.user.id, otherId],
  )
  res.json({
    user: {
      id: otherId,
      username: users[0].username,
      avatarUrl: users[0].avatar_url ?? '',
    },
    messages: messages.map((row) => ({
      id: Number(row.id),
      fromMe: Number(row.sender_id) === req.user.id,
      content: row.content,
      createdAt: row.created_at,
    })),
  })
})

app.post('/api/messages/dm', requireAuth, async (req, res) => {
  const toId = Number(req.body?.to)
  const content = String(req.body?.content ?? '').trim().slice(0, 2000)
  if (!toId || !content) return res.status(400).json({ error: 'invalid_input' })
  if (toId === req.user.id) return res.status(400).json({ error: 'cannot_message_self' })
  const users = await query(
    "SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1",
    [toId],
  )
  if (!users.length) return res.status(404).json({ error: 'not_found' })
  if (!rateLimit(`dm:${req.user.id}`, 60 * 1000, 30)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  const result = await execute(
    'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
    [req.user.id, toId, content],
  )
  await notify(toId, 'dm', '收到新私信', content.slice(0, 120), `/profile?chat=${req.user.id}`)
  res.status(201).json({ id: Number(result.insertId) })
})

// ============================================================
// 个人资料
// ============================================================
app.post('/api/profile/email-code', requireAuth, async (req, res) => {
  const email = asString(req.body?.email, 190).toLowerCase()
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (!rateLimit(`bind:${email}`, 60 * 1000, 1)) {
    return res.status(429).json({ error: 'too_soon' })
  }
  const taken = await query(
    'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
    [email, req.user.id],
  )
  if (taken.length) return res.status(409).json({ error: 'email_taken' })
  const blacklisted = await query(
    'SELECT email FROM email_blacklist WHERE email = ? LIMIT 1',
    [email],
  )
  if (blacklisted.length) return res.status(403).json({ error: 'email_blacklisted' })
  const code = await issueCode(email, 'bind')
  res.json({
    ok: true,
    devCode: !mailConfigured() && config.allowDevCodes ? code : undefined,
  })
})

app.post('/api/profile/email', requireAuth, async (req, res) => {
  const email = asString(req.body?.email, 190).toLowerCase()
  const code = asString(req.body?.code, 12)
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })
  const taken = await query(
    'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
    [email, req.user.id],
  )
  if (taken.length) return res.status(409).json({ error: 'email_taken' })
  if (!(await consumeCode(email, 'bind', code))) {
    return res.status(400).json({ error: 'invalid_code' })
  }
  await execute('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?', [
    email,
    req.user.id,
  ])
  const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id])
  res.json({ user: publicUser(normalizeUser(rows[0])) })
})

app.put('/api/profile', requireAuth, async (req, res) => {
  const patch = {}
  if (req.body?.avatarUrl !== undefined) {
    const avatarUrl = asString(req.body.avatarUrl, 500)
    if (avatarUrl && !avatarUrl.startsWith('/uploads/') && !/^https?:\/\//.test(avatarUrl)) {
      return res.status(400).json({ error: 'invalid_avatar' })
    }
    patch.avatar_url = avatarUrl
  }
  if (req.body?.gender !== undefined) {
    const gender = asString(req.body.gender, 16)
    if (!['', 'male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ error: 'invalid_gender' })
    }
    patch.gender = gender
  }
  if (req.body?.birthday !== undefined) {
    patch.birthday = asDate(req.body.birthday)
  }
  if (req.body?.bio !== undefined) {
    patch.bio = String(req.body.bio).slice(0, 500)
  }
  if (req.body?.tags !== undefined) {
    patch.tags = JSON.stringify(asTags(req.body.tags))
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'nothing_to_update' })
  }
  const columns = Object.keys(patch)
  await execute(
    `UPDATE users SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...columns.map((c) => patch[c]), req.user.id],
  )
  const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id])
  res.json({ user: publicUser(normalizeUser(rows[0])) })
})

app.get('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  const rows = await query('SELECT * FROM users WHERE id = ?', [id])
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const user = normalizeUser(rows[0])
  const self = req.user?.id === user.id
  res.json({
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      tags: user.tags,
      role: roleLabel(user),
      gender: self || req.user?.isSuper ? user.gender : '',
      birthday: self || req.user?.isSuper ? user.birthday : '',
      createdAt: user.createdAt,
      banned: banActive(user),
    },
  })
})

// ============================================================
// 概览
// ============================================================
app.get('/api/admin/overview', requireAuth, requireStaff, async (req, res) => {
  const user = req.user
  const counts = {}
  if (hasPermission(user, 'archive.articles')) {
    counts.articles = Number((await query('SELECT COUNT(*) AS n FROM articles'))[0].n)
  }
  if (hasPermission(user, 'archive.photos')) {
    counts.photos = Number((await query('SELECT COUNT(*) AS n FROM photos'))[0].n)
  }
  if (hasPermission(user, 'archive.videos')) {
    counts.videos = Number((await query('SELECT COUNT(*) AS n FROM videos'))[0].n)
  }
  if (hasPermission(user, 'logs')) {
    counts.logs = Number((await query('SELECT COUNT(*) AS n FROM logs'))[0].n)
  }
  if (user.isSuper || user.permissions.some(isForumPermission)) {
    counts.pendingPosts = Number(
      (await query(`SELECT COUNT(*) AS n FROM forum_posts WHERE status = 'pending'`))[0].n,
    )
    counts.pendingReplies = Number(
      (await query(`SELECT COUNT(*) AS n FROM forum_replies WHERE status = 'pending'`))[0].n,
    )
    counts.boards = Number((await query('SELECT COUNT(*) AS n FROM forum_boards'))[0].n)
  }
  if (
    user.isSuper ||
    user.permissions.includes('members.manage') ||
    user.permissions.includes('members.grant')
  ) {
    counts.users = Number((await query('SELECT COUNT(*) AS n FROM users'))[0].n)
  }
  res.json({ counts, role: roleLabel(user) })
})

// ============================================================
// 健康检查 / 静态资源
// ============================================================
app.get('/api/health', async (_req, res) => {
  try {
    await ping()
    res.json({
      ok: true,
      storage: 'mysql',
      version: '2.0.0',
      time: new Date().toISOString(),
    })
  } catch {
    res.status(503).json({ ok: false, error: 'db_unavailable' })
  }
})

app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    fallthrough: true,
    maxAge: '7d',
    setHeaders(response) {
      response.setHeader('Cache-Control', 'public, max-age=604800')
    },
  }),
)

if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      maxAge: '1h',
      setHeaders(response, filePath) {
        if (/[\\/]assets[\\/]/.test(filePath)) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
}

app.use((req, res, next) => {
  if (req.method !== 'GET') return next()
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ error: 'not_found' })
  }
  if (!fs.existsSync(DIST_DIR)) return next()
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.use((error, _req, res, _next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'file_too_large' })
  }
  console.error('[server]', error)
  res.status(500).json({ error: 'server_error' })
})

// ---------- 进程健壮性 ----------
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error)
})

const server = app.listen(config.port, () => {
  console.log(`[server] RHINE//HOME backend on http://localhost:${config.port}`)
  console.log(
    `[server] storage: mysql (${config.db.host}:${config.db.port}/${config.db.database})`,
  )
  console.log(`[server] mail: ${mailConfigured() ? 'smtp' : 'console (未配置 SMTP)'}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`[server] ${signal} received, shutting down`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000)
  })
}
