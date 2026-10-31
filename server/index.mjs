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
app.get('/api/admin/users', requireAuth, requireUserAdmin, async (_req, res) => {
  const rows = await query('SELECT * FROM users ORDER BY id ASC')
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
registerContent('photos', 'archive.photos', photoSanitize, ['url', 'name', 'date'], 'uploaded_by')
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
  sort: Number(row.sort),
  postCount: Number(row.post_count ?? 0),
  lastPostAt: row.last_post_at ?? null,
})

app.get('/api/forum/boards', async (_req, res) => {
  const rows = await query(
    `SELECT b.*,
      (SELECT COUNT(*) FROM forum_posts p WHERE p.board_id = b.id AND p.status = 'approved') AS post_count,
      (SELECT MAX(p.created_at) FROM forum_posts p WHERE p.board_id = b.id AND p.status = 'approved') AS last_post_at
     FROM forum_boards b ORDER BY b.sort ASC, b.id ASC`,
  )
  res.json({ boards: rows.map(boardPublic) })
})

app.get('/api/forum/boards/:slug', async (req, res) => {
  const slug = asString(req.params.slug, 64)
  const boards = await query('SELECT * FROM forum_boards WHERE slug = ? LIMIT 1', [slug])
  if (!boards.length) return res.status(404).json({ error: 'not_found' })
  const board = boards[0]
  const { page, limit, offset } = pageParams(req)
  const totalRows = await query(
    `SELECT COUNT(*) AS total FROM forum_posts WHERE board_id = ? AND status = 'approved'`,
    [board.id],
  )
  const posts = await query(
    `SELECT p.id, p.title, p.created_at, p.updated_at,
            u.username AS author, u.id AS author_id,
            (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id AND r.status = 'approved') AS reply_count
     FROM forum_posts p JOIN users u ON u.id = p.author_id
     WHERE p.board_id = ? AND p.status = 'approved'
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [board.id, limit, offset],
  )
  res.json({
    board: boardPublic({ ...board, post_count: totalRows[0].total }),
    posts: posts.map((p) => ({
      id: Number(p.id),
      title: p.title,
      author: p.author,
      authorId: Number(p.author_id),
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
    `SELECT p.*, u.username AS author, b.slug AS board_slug, b.name AS board_name
     FROM forum_posts p
     JOIN users u ON u.id = p.author_id
     JOIN forum_boards b ON b.id = p.board_id
     WHERE p.id = ? AND p.status = 'approved' LIMIT 1`,
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const post = rows[0]
  const replies = await query(
    `SELECT r.*, u.username AS author
     FROM forum_replies r JOIN users u ON u.id = r.author_id
     WHERE r.post_id = ? AND r.status = 'approved'
     ORDER BY r.created_at ASC LIMIT 200`,
    [id],
  )
  res.json({
    post: {
      id: Number(post.id),
      title: post.title,
      content: post.content,
      attachments: asAttachments(post.attachments),
      author: post.author,
      authorId: Number(post.author_id),
      board: { id: Number(post.board_id), slug: post.board_slug, name: post.board_name },
      createdAt: post.created_at,
    },
    replies: replies.map((r) => ({
      id: Number(r.id),
      content: r.content,
      attachments: asAttachments(r.attachments),
      author: r.author,
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

app.post('/api/forum/posts', requireAuth, requireVerifiedEmail, async (req, res) => {
  const boardId = Number(req.body?.boardId)
  const title = asString(req.body?.title, 200)
  const content = String(req.body?.content ?? '').slice(0, 200000)
  const attachments = asAttachments(req.body?.attachments)
  if (!title || !content.trim()) {
    return res.status(400).json({ error: 'invalid_input' })
  }
  const boards = await query('SELECT id FROM forum_boards WHERE id = ?', [boardId])
  if (!boards.length) return res.status(400).json({ error: 'invalid_board' })
  if (!rateLimit(`post:${req.user.id}`, 60 * 1000, 5)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  const result = await execute(
    `INSERT INTO forum_posts (board_id, author_id, title, content, attachments, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [boardId, req.user.id, title, content, JSON.stringify(attachments)],
  )
  res.status(201).json({
    id: Number(result.insertId),
    status: 'pending',
    message: '已提交，等待论坛管理员审核',
  })
})

app.post(
  '/api/forum/posts/:id/replies',
  requireAuth,
  requireVerifiedEmail,
  async (req, res) => {
    const postId = Number(req.params.id)
    const content = String(req.body?.content ?? '').slice(0, 20000)
    const attachments = asAttachments(req.body?.attachments)
    if (!content.trim()) return res.status(400).json({ error: 'invalid_input' })
    const posts = await query(
      `SELECT id FROM forum_posts WHERE id = ? AND status = 'approved' LIMIT 1`,
      [postId],
    )
    if (!posts.length) return res.status(404).json({ error: 'post_not_found' })
    if (!rateLimit(`reply:${req.user.id}`, 60 * 1000, 10)) {
      return res.status(429).json({ error: 'too_many_requests' })
    }
    const result = await execute(
      `INSERT INTO forum_replies (post_id, author_id, content, attachments, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [postId, req.user.id, content, JSON.stringify(attachments)],
    )
    res.status(201).json({
      id: Number(result.insertId),
      status: 'pending',
      message: '回复已提交，等待审核',
    })
  },
)

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
  if (!name || !SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'invalid_input' })
  }
  const exists = await query('SELECT id FROM forum_boards WHERE slug = ?', [slug])
  if (exists.length) return res.status(409).json({ error: 'slug_taken' })
  const result = await execute(
    'INSERT INTO forum_boards (slug, name, description, sort) VALUES (?, ?, ?, ?)',
    [slug, name, description, sort],
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
    const rows = await query('SELECT board_id FROM forum_posts WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    boardId = Number(rows[0].board_id)
    if (!canModerateBoard(req.user, boardId)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    await execute(
      `UPDATE forum_posts SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [approve ? 'approved' : 'rejected', note, req.user.id, id],
    )
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
