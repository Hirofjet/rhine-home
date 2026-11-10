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
  hasForumAction,
  hashPassword,
  isForumPermission,
  isStaff,
  normalizeUser,
  permissionsForRole,
  publicUser,
  pruneSessions,
  roleClass,
  roleLabel,
  ROLE_KEYS,
  ROLE_LABELS,
  sanitizePermissions,
  tokenFromRequest,
  userBySession,
  verifyPassword,
} from './auth.mjs'
import { mailConfigured, sendCodeMail } from './mail.mjs'
import { importLegacyIfEmpty } from './legacy-import.mjs'
import { generateTotpSecret, totpUri, verifyTotp } from './totp.mjs'
import {
  auditRequest,
  adminAuditMiddleware,
  clientIp,
  requestLogger,
  startSecurityLogMaintenance,
} from './security-logs.mjs'
import {
  invalidateModerationCache,
  matchModeration,
  moderationBlockedResponse,
  moderationSettings,
} from './moderation.mjs'

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
startSecurityLogMaintenance()

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

/**
 * 手动权限保存后，避免出现“权限已撤销但身份头衔还在”的脏状态。
 * 身份头衔必须仍然有对应的基础权限或板块权限支撑。
 */
async function effectiveRoleAfterPermissions(target, permissions) {
  if (target.isSuper) return 'super'
  const role = target.identity || 'member'
  if (role === 'member' || role === 'super') return role
  if (role === 'regulator') {
    return permissions.includes('security.readonly') ? role : 'member'
  }
  if (!permissions.length) return 'member'
  if (role === 'senior' || role === 'forum_master') {
    return permissions.includes('forum') ? role : 'member'
  }
  const cls = roleClass(role)
  if (!cls) return role
  if (permissions.includes('forum')) return role
  const boards = await query('SELECT id FROM forum_boards WHERE access = ?', [cls])
  const hasClassBoard = boards.some((board) => permissions.includes(`forum.${board.id}`))
  return hasClassBoard ? role : 'member'
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

// 重新部署后内容表为空时，自动恢复旧版 markdown / JSON 数据
if ((process.env.AUTO_IMPORT_LEGACY ?? '1') === '1') {
  try {
    const restored = await importLegacyIfEmpty({ query, execute })
    if (restored.length) {
      console.log(`[legacy] 已恢复旧数据：${restored.join(', ')}`)
    }
  } catch (error) {
    console.error('[legacy] 自动恢复失败：', error.message)
  }
}

// ---------- Express ----------
const app = express()
app.set('trust proxy', config.trustProxy || false)
if (config.corsOrigin) {
  app.use(cors({ origin: config.corsOrigin.split(',').map((s) => s.trim()) }))
}
app.use(compression())
app.use(express.json({ limit: '8mb' }))
app.use(requestLogger)
app.use(auth)
app.use(adminAuditMiddleware)
app.use((req, res, next) => {
  const readOnly =
    !req.user?.isSuper &&
    (req.user?.identity === 'regulator' ||
      req.user?.permissions?.includes('security.readonly'))
  if (
    readOnly &&
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.path !== '/api/auth/logout'
  ) {
    return res.status(403).json({ error: 'readonly_account' })
  }
  next()
})

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
  void auditRequest(req, {
    action: 'auth.register',
    actorId: user.id,
    actorUsername: user.username,
    status: 201,
    detail: { emailVerified: true },
  })
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
    void auditRequest(req, {
      action: 'auth.login.failed',
      actorUsername: login.slice(0, 64),
      status: 401,
      detail: { reason: 'invalid_credentials' },
    })
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
      void auditRequest(req, {
        action: 'auth.login.banned',
        actorId: user.id,
        actorUsername: user.username,
        status: 403,
        detail: { bannedUntil: user.bannedUntil },
      })
      return res.status(403).json({
        error: 'account_banned',
        until: user.bannedUntil,
        reason: user.bannedReason,
      })
    }
  }
  if (user.mfaEnabled) {
    const mfaCode = String(req.body?.mfaCode ?? '').trim()
    if (!mfaCode) {
      void auditRequest(req, {
        action: 'auth.login.mfa_required',
        actorId: user.id,
        actorUsername: user.username,
        status: 401,
      })
      return res.status(401).json({ error: 'mfa_required' })
    }
    if (!verifyTotp(user.mfaSecret, mfaCode)) {
      void auditRequest(req, {
        action: 'auth.login.mfa_failed',
        actorId: user.id,
        actorUsername: user.username,
        status: 401,
      })
      return res.status(401).json({ error: 'mfa_invalid' })
    }
  }
  const token = await createSession(user.id)
  void auditRequest(req, {
    action: 'auth.login.success',
    actorId: user.id,
    actorUsername: user.username,
    status: 200,
  })
  res.json({ token, user: publicUser(user) })
})

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  void auditRequest(req, {
    action: 'auth.logout',
    status: 200,
  })
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
  void auditRequest(req, {
    action: 'auth.password.reset',
    actorId: rows[0].id,
    actorUsername: email,
    status: 200,
  })
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
// 多因素认证（TOTP）
// ============================================================
app.get('/api/admin/me/mfa', requireAuth, async (req, res) => {
  const rows = await query('SELECT mfa_enabled FROM users WHERE id = ?', [req.user.id])
  res.json({ enabled: Boolean(rows[0]?.mfa_enabled) })
})

app.post('/api/admin/me/mfa/setup', requireAuth, async (req, res) => {
  const rows = await query('SELECT mfa_enabled FROM users WHERE id = ?', [req.user.id])
  if (rows[0]?.mfa_enabled) {
    return res.status(409).json({ error: 'mfa_already_enabled' })
  }
  const secret = generateTotpSecret()
  await execute('UPDATE users SET mfa_secret = ?, mfa_enabled = 0 WHERE id = ?', [
    secret,
    req.user.id,
  ])
  res.json({
    secret,
    uri: totpUri(secret, req.user.username),
    issuer: 'RHINE//HOME',
  })
})

app.post('/api/admin/me/mfa/enable', requireAuth, async (req, res) => {
  const code = String(req.body?.code ?? '').replace(/\s/g, '')
  const rows = await query('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?', [
    req.user.id,
  ])
  if (rows[0]?.mfa_enabled) return res.status(409).json({ error: 'mfa_already_enabled' })
  if (!rows[0]?.mfa_secret || !verifyTotp(rows[0].mfa_secret, code)) {
    return res.status(400).json({ error: 'invalid_mfa_code' })
  }
  await execute('UPDATE users SET mfa_enabled = 1 WHERE id = ?', [req.user.id])
  res.json({ ok: true })
})

app.post('/api/admin/me/mfa/disable', requireAuth, async (req, res) => {
  const password = String(req.body?.password ?? '')
  const code = String(req.body?.code ?? '').replace(/\s/g, '')
  const rows = await query(
    'SELECT password_hash, mfa_secret, mfa_enabled FROM users WHERE id = ?',
    [req.user.id],
  )
  if (!verifyPassword(password, rows[0]?.password_hash)) {
    return res.status(400).json({ error: 'wrong_password' })
  }
  if (!rows[0]?.mfa_enabled || !verifyTotp(rows[0].mfa_secret, code)) {
    return res.status(400).json({ error: 'invalid_mfa_code' })
  }
  await execute('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?', [
    req.user.id,
  ])
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
  '/api/admin/users/:id/permissions',  requireAuth,
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
    const nextRole = await effectiveRoleAfterPermissions(target, permissions)
    await execute('UPDATE users SET permissions = ?, role_code = ? WHERE id = ?', [
      JSON.stringify(permissions),
      nextRole,
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

app.put('/api/admin/users/:id/identity', requireAuth, async (req, res) => {
  if (!req.user.isSuper) return res.status(403).json({ error: 'super_only' })
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'cannot_change_own_identity' })
  const role = String(req.body?.identity ?? '')
  if (!ROLE_KEYS.includes(role) || role === 'super') {
    return res.status(400).json({ error: 'invalid_identity' })
  }
  const targetRows = await query('SELECT * FROM users WHERE id = ?', [id])
  const target = normalizeUser(targetRows[0])
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (target.isSuper) return res.status(403).json({ error: 'cannot_modify_super' })

  const masterRoles = new Set(['core_master', 'special_master', 'normal_master'])
  const adminRoles = new Set(['core_admin', 'special_admin', 'normal_admin'])
  if (masterRoles.has(role)) {
    const existing = await query(
      'SELECT id FROM users WHERE role_code = ? AND id <> ? LIMIT 1',
      [role, id],
    )
    if (existing.length) return res.status(409).json({ error: 'identity_limit' })
  }
  if (adminRoles.has(role)) {
    const rows = await query('SELECT COUNT(*) AS n FROM users WHERE role_code = ? AND id <> ?', [
      role,
      id,
    ])
    if (Number(rows[0]?.n ?? 0) >= 4) return res.status(409).json({ error: 'identity_limit' })
  }

  const permissions = [
    ...new Set([...permissionsForRole(role), ...target.permissions.filter(isForumPermission)]),
  ]
  await execute('UPDATE users SET role_code = ?, permissions = ? WHERE id = ?', [
    role,
    JSON.stringify([...new Set(permissions)]),
    id,
  ])
  await notify(
    id,
    'permission',
    '你的身份已更新',
    `当前身份：${ROLE_LABELS[role]}`,
    '/profile',
  )
  const updated = await query('SELECT * FROM users WHERE id = ?', [id])
  res.json({ user: publicUser(normalizeUser(updated[0])) })
})

app.delete('/api/admin/users/:id', requireAuth, requireMembersManage, async (req, res) => {  const id = Number(req.params.id)
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
  const rows = await query(
    `SELECT l.*, COALESCE(NULLIF(u.nickname, ''), u.username, '示例用户') AS author
     FROM logs l LEFT JOIN users u ON u.id = l.author_id
     ORDER BY l.date DESC, l.id DESC LIMIT 60`,
  )
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

// ---------- 项目库 ----------
const projectSanitize = (body) => {
  if (!body) return null
  const code = asString(body.code, 64).toUpperCase()
  const name = asString(body.name, 200)
  const description = asString(body.description, 1000)
  if (!name || !description) return null
  return {
    code,
    name,
    short_name: asString(body.shortName ?? body.short_name, 100) || code || name,
    description,
    type: asString(body.type, 100),
    tags: Array.isArray(body.tags)
      ? body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12)
      : [],
    author: asString(body.author, 120),
    status: asString(body.status, 32) || 'ACTIVE',
    version: asString(body.version, 64) || '0.1.0',
    github_url: asString(body.githubUrl ?? body.github_url, 500),
    details: asString(body.details, 20000),
    visible: body.visible === false ? 0 : 1,
    sort: Number(body.sort) || 0,
  }
}

const mapProject = (row) => ({
  id: Number(row.id),
  code: row.code,
  name: row.name,
  shortName: row.short_name,
  description: row.description,
  type: row.type,
  tags: (() => {
    try {
      return Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags ?? '[]')
    } catch {
      return []
    }
  })(),
  author: row.author,
  status: row.status,
  version: row.version,
  githubUrl: row.github_url ?? '',
  details: row.details ?? '',
  visible: Boolean(row.visible),
  sort: Number(row.sort),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

app.get('/api/content/projects', async (_req, res) => {
  const rows = await query(
    'SELECT * FROM projects WHERE visible = 1 ORDER BY sort ASC, id DESC LIMIT 100',
  )
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items: rows.map(mapProject) })
})

app.get('/api/admin/projects', requireAuth, requirePermission('projects'), async (_req, res) => {
  const rows = await query('SELECT * FROM projects ORDER BY sort ASC, id DESC LIMIT 200')
  res.json({ items: rows.map(mapProject) })
})

app.post('/api/admin/projects', requireAuth, requirePermission('projects'), async (req, res) => {
  const data = projectSanitize(req.body)
  if (!data) return res.status(400).json({ error: 'invalid_input' })
  if (!data.code) {
    const rows = await query('SELECT code FROM projects')
    const max = rows.reduce((value, row) => {
      const match = /(\d+)\s*$/.exec(String(row.code ?? ''))
      return Math.max(value, match ? Number(match[1]) : 0)
    }, 0)
    data.code = `RL-PJ-${String(max + 1).padStart(2, '0')}`
    if (!data.short_name) data.short_name = data.name
  }
  const columns = Object.keys(data)
  try {
    const result = await execute(
      `INSERT INTO projects (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => (column === 'tags' ? JSON.stringify(data[column]) : data[column])),
    )
    const rows = await query('SELECT * FROM projects WHERE id = ?', [result.insertId])
    res.status(201).json(mapProject(rows[0]))
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'code_exists' })
    throw error
  }
})

app.put('/api/admin/projects/:id', requireAuth, requirePermission('projects'), async (req, res) => {
  const data = projectSanitize(req.body)
  if (!data) return res.status(400).json({ error: 'invalid_input' })
  if (!data.code) {
    const existing = await query('SELECT code FROM projects WHERE id = ?', [Number(req.params.id)])
    if (!existing.length) return res.status(404).json({ error: 'not_found' })
    data.code = existing[0].code
  }
  const columns = Object.keys(data)
  await execute(
    `UPDATE projects SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
    [
      ...columns.map((column) => (column === 'tags' ? JSON.stringify(data[column]) : data[column])),
      Number(req.params.id),
    ],
  )
  const rows = await query('SELECT * FROM projects WHERE id = ?', [Number(req.params.id)])
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  res.json(mapProject(rows[0]))
})

app.delete('/api/admin/projects/:id', requireAuth, requirePermission('projects'), async (req, res) => {
  await execute('DELETE FROM projects WHERE id = ?', [Number(req.params.id)])
  res.json({ ok: true })
})

// ---------- 主页资料（仅 admin 可改） ----------
const HOME_FIELDS = [
  'codeName',
  'realName',
  'roles',
  'intro',
  'dossier',
  'occupation',
  'affiliation',
  'status',
  'location',
  'specialties',
  'traits',
  'contactEmail',
  'github',
]

const sanitizeHomeProfile = (body) => {
  if (!body || typeof body !== 'object') return null
  const profile = {}
  for (const field of HOME_FIELDS) {
    const value = body[field]
    if (field === 'roles' || field === 'dossier' || field === 'specialties' || field === 'traits') {
      profile[field] = Array.isArray(value)
        ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 30)
        : []
    } else {
      profile[field] = asString(value, field === 'dossier' ? 500 : 300)
    }
  }
  return profile
}

const sanitizeAbility = (item) => ({
  id: asString(item?.id, 64),
  code: asString(item?.code, 64),
  name: asString(item?.name, 120),
  nameEn: asString(item?.nameEn, 120),
  desc: asString(item?.desc, 500),
  level: Math.max(0, Math.min(100, Number(item?.level) || 0)),
  grade: ['S', 'A', 'B'].includes(item?.grade) ? item.grade : 'B',
  icon: ['code', 'design', 'research', 'game', 'data', 'music'].includes(item?.icon)
    ? item.icon
    : 'code',
})

const sanitizeContact = (item) => ({
  id: asString(item?.id, 64),
  label: asString(item?.label, 120),
  labelEn: asString(item?.labelEn, 120),
  value: asString(item?.value, 200),
  href: asString(item?.href, 500),
  icon: ['github', 'bilibili', 'mail', 'music', 'chat'].includes(item?.icon)
    ? item.icon
    : 'chat',
  note: asString(item?.note, 100),
})

const sanitizeLink = (item) => ({
  id: asString(item?.id, 64),
  label: asString(item?.label, 120),
  href: asString(item?.href, 500),
  note: asString(item?.note, 120),
})

const sanitizeHomeContent = (body) => {
  const profileSource = body?.profile ?? body
  const profile = sanitizeHomeProfile(profileSource)
  if (!profile) return null
  return {
    profile,
    abilities: Array.isArray(body?.abilities)
      ? body.abilities.filter((item) => item && item.name).slice(0, 30).map(sanitizeAbility)
      : [],
    contacts: Array.isArray(body?.contacts)
      ? body.contacts.filter((item) => item && item.label).slice(0, 30).map(sanitizeContact)
      : [],
    links: Array.isArray(body?.links)
      ? body.links.filter((item) => item && item.label).slice(0, 30).map(sanitizeLink)
      : [],
  }
}

app.get('/api/site/home', async (_req, res) => {
  const rows = await query('SELECT data, updated_at FROM site_profile WHERE id = 1')
  let content = null
  if (rows.length) {
    try {
      const raw = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data
      content = raw?.profile
        ? raw
        : { profile: raw, abilities: [], contacts: [], links: [] }
    } catch {
      content = null
    }
  }
  res.set('Cache-Control', 'public, max-age=15')
  res.json({
    profile: content?.profile ?? null,
    abilities: content?.abilities ?? [],
    contacts: content?.contacts ?? [],
    links: content?.links ?? [],
    updatedAt: rows[0]?.updated_at ?? null,
  })
})

app.put('/api/site/home', requireAuth, async (req, res) => {
  if (!req.user.isSuper) return res.status(403).json({ error: 'forbidden' })
  const content = sanitizeHomeContent(req.body)
  if (!content) return res.status(400).json({ error: 'invalid_input' })
  await execute(
    `INSERT INTO site_profile (id, data, updated_by) VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by)`,
    [JSON.stringify(content), req.user.id],
  )
  res.json(content)
})

// 站点所有者资料：主页头像与后台超级管理员保持同步
app.get('/api/site/profile', async (_req, res) => {
  const rows = await query(
    `SELECT id, nickname, avatar_url FROM users
     WHERE is_super = 1 ORDER BY id ASC LIMIT 1`,
  )
  const owner = rows[0]
  res.set('Cache-Control', 'public, max-age=30')
  res.json({
    profile: {
      id: owner ? Number(owner.id) : null,
      nickname: owner?.nickname ?? '',
      avatarUrl: owner?.avatar_url ?? '',
    },
  })
})

// ---------- 留言板 ----------
const guestTokenOf = (req) => asString(req.headers['x-guest-token'], 64)

app.get('/api/messages', async (req, res) => {
  const token = guestTokenOf(req)
  const rows = await query(
    `SELECT id, name, content, user_id, owner_token, status, created_at AS createdAt
     FROM guest_messages
     WHERE status = 'approved'
     ORDER BY id DESC LIMIT 60`,
  )
  res.json({
    messages: rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      content: row.content,
      status: row.status,
      createdAt: row.createdAt,
      mine:
        (Boolean(token) && row.owner_token === token) ||
        Boolean(req.user && Number(row.user_id) === req.user.id),
    })),
  })
})

app.post('/api/messages', async (req, res) => {
  const name = asString(req.body?.name, 24)
  const content = asString(req.body?.content, 120)
  if (!name || !content) return res.status(400).json({ error: 'invalid_input' })
  if (!rateLimit(`guestbook:${req.ip}`, 60 * 1000, 3)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  const settings = await moderationSettings()
  if (settings.emergencyStop) {
    return res.status(423).json({ error: 'moderation_closed', message: '留言暂时关闭。' })
  }
  const matched = await matchModeration(`${name}\n${content}`)
  if (matched?.action === 'block') return moderationBlockedResponse(res, matched.term)
  const status =
    settings.guestbookRequireReview || matched?.action === 'review'
      ? 'pending'
      : 'approved'
  const token =
    guestTokenOf(req) ||
    asString(req.body?.token, 64) ||
    crypto.randomBytes(16).toString('hex')
  const result = await execute(
    'INSERT INTO guest_messages (name, content, user_id, owner_token, status) VALUES (?, ?, ?, ?, ?)',
    [name, content, req.user?.id ?? null, token, status],
  )
  res.status(201).json({
    id: Number(result.insertId),
    name,
    content,
    status,
    createdAt: new Date().toISOString(),
    token,
    message: status === 'approved' ? '留言已发布' : '留言已提交审核',
  })
})

app.delete('/api/messages/:id', async (req, res) => {
  const id = Number(req.params.id)
  const rows = await query(
    'SELECT user_id, owner_token FROM guest_messages WHERE id = ?',
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const token = guestTokenOf(req)
  const allowed =
    (Boolean(token) && rows[0].owner_token === token) ||
    Boolean(
      req.user &&
        (Number(rows[0].user_id) === req.user.id ||
          hasPermission(req.user, 'guestbook')),
    )
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  await execute('DELETE FROM guest_messages WHERE id = ?', [id])
  res.json({ ok: true })
})

// ---------- 后台留言管理 ----------
app.get('/api/admin/messages', requireAuth, requirePermission('guestbook'), async (_req, res) => {
  const rows = await query(
    `SELECT id, name, content, user_id, status, created_at AS createdAt
     FROM guest_messages ORDER BY id DESC LIMIT 300`,
  )
  res.json({ messages: rows })
})

app.post(
  '/api/admin/messages/:id/review',
  requireAuth,
  requirePermission('guestbook'),
  async (req, res) => {
    const id = Number(req.params.id)
    const approve = req.body?.approve === true
    const note = asString(req.body?.note, 255)
    const rows = await query(
      'SELECT user_id FROM guest_messages WHERE id = ? LIMIT 1',
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    await execute(
      `UPDATE guest_messages
       SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [approve ? 'approved' : 'rejected', note || null, req.user.id, id],
    )
    if (rows[0].user_id) {
      await notify(
        Number(rows[0].user_id),
        'review',
        approve ? '留言已通过审核' : '留言未通过审核',
        note || '你的留言状态已更新',
        '/guestbook',
      )
    }
    res.json({ ok: true })
  },
)

app.delete(
  '/api/admin/messages/:id',
  requireAuth,
  requirePermission('guestbook'),
  async (req, res) => {
    await execute('DELETE FROM guest_messages WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  },
)

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
  tags: parseTags(row.tags),
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
  if (access === 'core') {
    if (user.isSuper) return true
    if (hasPermission(user, 'forum')) return true
    const rows = await query(
      'SELECT id FROM forum_invites WHERE board_id = ? AND user_id = ? LIMIT 1',
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
     FROM forum_boards b ORDER BY last_post_at DESC, b.id DESC`,
  )
  const boards = []
  for (const row of rows) {
    const board = boardPublic(row)
    const canAccess = await canAccessBoard(req.user, board)
    const canSeeCore =
      board.access !== 'core' ||
      canAccess ||
      Boolean(
        req.user &&
          (req.user.isSuper ||
            hasPermission(req.user, 'forum') ||
            hasPermission(req.user, `forum.${board.id}`)),
      )
    if (!canSeeCore) continue
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
    `SELECT a.*, COALESCE(NULLIF(u.nickname,''), u.username) AS author
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
            COALESCE(NULLIF(u.nickname,''), u.username) AS author, u.id AS author_id, u.avatar_url AS author_avatar,
            u.forum_title AS author_title, u.forum_level AS author_level,
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
      authorTitle: p.author_title ?? '',
      authorLevel: Number(p.author_level ?? 0),
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
    `SELECT p.*, COALESCE(NULLIF(u.nickname,''), u.username) AS author, u.avatar_url AS author_avatar,
            u.forum_title AS author_title, u.forum_level AS author_level,
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
    `SELECT r.*, COALESCE(NULLIF(u.nickname,''), u.username) AS author, u.avatar_url AS author_avatar,
            u.forum_title AS author_title, u.forum_level AS author_level
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
      authorTitle: post.author_title ?? '',
      authorLevel: Number(post.author_level ?? 0),
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
      authorTitle: r.author_title ?? '',
      authorLevel: Number(r.author_level ?? 0),
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

/** 论坛活跃度：发帖 5 分、回复 1 分，按规则自动发头衔。 */
async function refreshForumActivity(userId) {
  if (!userId) return
  try {
    const stats = await query(
      `SELECT
         (SELECT COUNT(*) FROM forum_posts WHERE author_id = ? AND status = 'approved') AS posts,
         (SELECT COUNT(*) FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id
           WHERE r.author_id = ? AND r.status = 'approved' AND p.status = 'approved') AS replies`,
      [userId, userId],
    )
    const points = Number(stats[0]?.posts ?? 0) * 5 + Number(stats[0]?.replies ?? 0)
    const rules = await query(
      'SELECT level, min_points, title FROM forum_title_rules ORDER BY min_points DESC, level DESC',
    )
    const matched = rules.find((rule) => points >= Number(rule.min_points))
    const level = matched ? Number(matched.level) : 0
    const autoTitle = matched?.title ? String(matched.title).slice(0, 64) : ''
    const rows = await query('SELECT forum_title, forum_title_locked FROM users WHERE id = ?', [
      userId,
    ])
    const locked = Boolean(rows[0]?.forum_title_locked)
    await execute(
      `UPDATE users SET forum_points = ?, forum_level = ?${locked ? '' : ', forum_title = ?'} WHERE id = ?`,
      locked ? [points, level, userId] : [points, level, autoTitle, userId],
    )
  } catch (error) {
    console.error('[activity]', error.message)
  }
}

// ============================================================
// 举报、投诉与内容安全设置
// ============================================================
const REPORT_CATEGORIES = new Set([
  'illegal',
  'harassment',
  'privacy',
  'copyright',
  'fraud',
  'other',
])
const REPORT_TARGETS = new Set(['post', 'reply', 'message', 'user', 'guestbook', 'complaint'])

const canReadReports = (user) =>
  Boolean(
    user?.isSuper ||
      ['super', 'senior', 'admin'].includes(user?.identity) ||
      user?.permissions?.includes('members.manage') ||
      user?.permissions?.includes('security.readonly'),
  )

const canHandleReports = (user) =>
  Boolean(
    user?.isSuper ||
      ['super', 'senior', 'admin'].includes(user?.identity) ||
      user?.permissions?.includes('members.manage'),
  )

function reportTicket() {
  return crypto.randomBytes(6).toString('hex').toUpperCase()
}

async function buildReportSnapshot(targetType, targetId, reporter) {
  if (targetType === 'complaint') {
    return { ownerId: null, snapshot: '站内投诉/建议' }
  }
  if (targetType === 'user') {
    const rows = await query(
      'SELECT id, username, nickname, bio FROM users WHERE id = ? LIMIT 1',
      [Number(targetId)],
    )
    if (!rows.length) return null
    return {
      ownerId: Number(rows[0].id),
      snapshot: `用户：${rows[0].nickname || rows[0].username}\n简介：${rows[0].bio || '（空）'}`,
    }
  }
  if (targetType === 'post') {
    const rows = await query(
      `SELECT p.id, p.title, p.content, p.author_id, p.status, p.board_id, b.name AS board_name
       FROM forum_posts p JOIN forum_boards b ON b.id = p.board_id
       WHERE p.id = ? LIMIT 1`,
      [Number(targetId)],
    )
    if (!rows.length) return null
    return {
      ownerId: Number(rows[0].author_id),
      snapshot: `板块：${rows[0].board_name}\n标题：${rows[0].title}\n内容：${String(rows[0].content).slice(0, 3000)}`,
    }
  }
  if (targetType === 'reply') {
    const rows = await query(
      `SELECT r.id, r.content, r.author_id, r.post_id, p.title AS post_title
       FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id
       WHERE r.id = ? LIMIT 1`,
      [Number(targetId)],
    )
    if (!rows.length) return null
    return {
      ownerId: Number(rows[0].author_id),
      snapshot: `回复所属帖子：${rows[0].post_title}\n回复：${String(rows[0].content).slice(0, 3000)}`,
    }
  }
  if (targetType === 'guestbook') {
    const rows = await query(
      'SELECT id, name, content, user_id FROM guest_messages WHERE id = ? LIMIT 1',
      [Number(targetId)],
    )
    if (!rows.length) return null
    return {
      ownerId: rows[0].user_id ? Number(rows[0].user_id) : null,
      snapshot: `留言：${rows[0].name}\n${rows[0].content}`,
    }
  }
  if (targetType === 'message') {
    if (!reporter) return null
    const rows = await query(
      `SELECT id, sender_id, receiver_id, content, created_at
       FROM direct_messages
       WHERE id = ? AND (sender_id = ? OR receiver_id = ?) LIMIT 1`,
      [Number(targetId), reporter.id, reporter.id],
    )
    if (!rows.length) return null
    const conversation = await query(
      `SELECT sender_id, content, created_at FROM direct_messages
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND id <= ?
       ORDER BY id DESC LIMIT 6`,
      [
        rows[0].sender_id,
        rows[0].receiver_id,
        rows[0].receiver_id,
        rows[0].sender_id,
        Number(targetId),
      ],
    )
    return {
      ownerId:
        Number(rows[0].sender_id) === reporter.id
          ? Number(rows[0].receiver_id)
          : Number(rows[0].sender_id),
      snapshot: conversation
        .reverse()
        .map((item) => `${Number(item.sender_id) === reporter.id ? '我' : '对方'}：${String(item.content).slice(0, 500)}`)
        .join('\n'),
    }
  }
  return null
}

app.post('/api/reports', async (req, res) => {
  const targetType = asString(req.body?.targetType, 32)
  const targetId = asString(req.body?.targetId, 64) || (targetType === 'complaint' ? 'site' : '')
  const category = asString(req.body?.category, 32) || 'other'
  const detail = String(req.body?.detail ?? '').trim().slice(0, 2000)
  const contact = asString(req.body?.contact, 190)
  if (!REPORT_TARGETS.has(targetType) || !targetId || !REPORT_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'invalid_report' })
  }
  if (!rateLimit(`report:${req.ip}`, 60 * 60 * 1000, 8)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  if (!req.user && !contact) {
    return res.status(400).json({ error: 'contact_required' })
  }
  const snapshot = await buildReportSnapshot(targetType, targetId, req.user)
  if (!snapshot) return res.status(404).json({ error: 'target_not_found' })
  const ticket = reportTicket()
  const reporterName =
    req.user?.nickname || req.user?.username || asString(req.body?.name, 64) || '匿名访客'
  await execute(
    `INSERT INTO content_reports
      (ticket, reporter_id, reporter_name, reporter_contact, target_type, target_id,
       target_owner_id, category, detail, snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticket,
      req.user?.id ?? null,
      reporterName,
      contact || null,
      targetType,
      targetId,
      snapshot.ownerId,
      category,
      detail,
      snapshot.snapshot.slice(0, 8000),
    ],
  )
  if (req.user) {
    await notify(
      req.user.id,
      'report',
      '举报已受理',
      `工单 ${ticket} 已进入处理队列。`,
      `/complaints?ticket=${ticket}`,
    )
  }
  res.status(201).json({
    ok: true,
    ticket,
    message: '举报已提交，请保存工单号以便查询。',
  })
})

app.get('/api/reports/:ticket', async (req, res) => {
  const ticket = asString(req.params.ticket, 20).toUpperCase()
  if (!ticket) return res.status(400).json({ error: 'invalid_ticket' })
  if (!rateLimit(`report-lookup:${req.ip}`, 10 * 60 * 1000, 30)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  const rows = await query(
    `SELECT ticket, target_type AS targetType, category, status,
            resolution, appeal_status AS appealStatus, created_at AS createdAt,
            handled_at AS handledAt
     FROM content_reports WHERE ticket = ? LIMIT 1`,
    [ticket],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  res.json({ report: rows[0] })
})

app.post('/api/reports/:ticket/appeal', requireAuth, async (req, res) => {
  const ticket = asString(req.params.ticket, 20).toUpperCase()
  const appeal = String(req.body?.appeal ?? '').trim().slice(0, 2000)
  if (!appeal) return res.status(400).json({ error: 'invalid_appeal' })
  const rows = await query(
    'SELECT id, reporter_id, status FROM content_reports WHERE ticket = ? LIMIT 1',
    [ticket],
  )
  if (!rows.length || Number(rows[0].reporter_id) !== req.user.id) {
    return res.status(404).json({ error: 'not_found' })
  }
  if (!['resolved', 'rejected'].includes(rows[0].status)) {
    return res.status(409).json({ error: 'not_appealable' })
  }
  await execute(
    `UPDATE content_reports
     SET status = 'appealed', appeal = ?, appeal_status = 'pending'
     WHERE id = ?`,
    [appeal, rows[0].id],
  )
  res.json({ ok: true })
})

app.get('/api/admin/reports', requireAuth, async (req, res) => {
  if (!canReadReports(req.user)) return res.status(403).json({ error: 'forbidden' })
  const { page, limit, offset } = pageParams(req, 30)
  const status = asString(req.query.status, 32)
  const targetType = asString(req.query.targetType, 32)
  const clauses = []
  const params = []
  if (status) {
    clauses.push('status = ?')
    params.push(status)
  }
  if (targetType) {
    clauses.push('target_type = ?')
    params.push(targetType)
  }
  const where = clauses.length ? clauses.join(' AND ') : '1=1'
  const count = await query(
    `SELECT COUNT(*) AS total FROM content_reports WHERE ${where}`,
    params,
  )
  const rows = await query(
    `SELECT id, ticket, reporter_name AS reporterName, reporter_contact AS reporterContact,
            target_type AS targetType, target_id AS targetId, category, detail, snapshot,
            status, resolution, appeal, appeal_status AS appealStatus,
            created_at AS createdAt, handled_at AS handledAt
     FROM content_reports WHERE ${where}
     ORDER BY FIELD(status, 'pending','reviewing','appealed','resolved','rejected'), id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  res.json({
    reports: rows,
    pagination: { page, limit, total: Number(count[0]?.total ?? 0) },
    canHandle: canHandleReports(req.user),
    readonly: !canHandleReports(req.user),
  })
})

app.post('/api/admin/reports/:id', requireAuth, async (req, res) => {
  if (!canHandleReports(req.user)) return res.status(403).json({ error: 'forbidden' })
  const id = Number(req.params.id)
  const status = String(req.body?.status ?? '')
  if (!['reviewing', 'resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'invalid_status' })
  }
  const rows = await query(
    'SELECT * FROM content_reports WHERE id = ? LIMIT 1',
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const resolution = String(req.body?.resolution ?? '').trim().slice(0, 500)
  const hideContent = req.body?.hideContent === true
  if (hideContent) {
    if (rows[0].target_type === 'post') {
      await execute(
        `UPDATE forum_posts SET status = 'hidden', pinned = 0 WHERE id = ? AND status <> 'deleted'`,
        [Number(rows[0].target_id)],
      )
    } else if (rows[0].target_type === 'reply') {
      await execute(
        `UPDATE forum_replies SET status = 'rejected' WHERE id = ? AND status <> 'deleted'`,
        [Number(rows[0].target_id)],
      )
    } else if (rows[0].target_type === 'guestbook') {
      await execute(
        `UPDATE guest_messages SET status = 'rejected' WHERE id = ?`,
        [Number(rows[0].target_id)],
      )
    }
  }
  await execute(
    `UPDATE content_reports
     SET status = ?, resolution = ?, handled_by = ?, handled_at = NOW()
     WHERE id = ?`,
    [status, resolution || null, req.user.id, id],
  )
  if (rows[0].reporter_id) {
    await notify(
      Number(rows[0].reporter_id),
      'report',
      status === 'resolved' ? '举报已处理' : status === 'rejected' ? '举报未通过' : '举报处理中',
      `${rows[0].ticket}：${resolution || '处理状态已更新'}`,
      `/complaints?ticket=${rows[0].ticket}`,
    )
  }
  res.json({ ok: true })
})

app.get('/api/admin/moderation/settings', requireAuth, async (req, res) => {
  if (!canHandleReports(req.user)) return res.status(403).json({ error: 'forbidden' })
  const settings = await moderationSettings()
  const terms = await query(
    'SELECT id, term, action, enabled, created_at FROM moderation_terms ORDER BY id ASC',
  )
  res.json({ settings, terms })
})

app.put('/api/admin/moderation/settings', requireAuth, async (req, res) => {
  if (!canHandleReports(req.user)) return res.status(403).json({ error: 'forbidden' })
  const settings = {
    emergencyStop: Boolean(req.body?.emergencyStop),
    repliesRequireReview: req.body?.repliesRequireReview !== false,
    guestbookRequireReview: req.body?.guestbookRequireReview !== false,
  }
  await execute(
    `UPDATE moderation_settings
     SET emergency_stop = ?, replies_require_review = ?, guestbook_require_review = ?,
         updated_by = ?, updated_at = NOW()
     WHERE id = 1`,
    [
      settings.emergencyStop ? 1 : 0,
      settings.repliesRequireReview ? 1 : 0,
      settings.guestbookRequireReview ? 1 : 0,
      req.user.id,
    ],
  )
  invalidateModerationCache()
  res.json({ ok: true, settings })
})

app.post('/api/admin/moderation/terms', requireAuth, async (req, res) => {
  if (!canHandleReports(req.user)) return res.status(403).json({ error: 'forbidden' })
  const term = String(req.body?.term ?? '').trim().slice(0, 80)
  const action = req.body?.action === 'block' ? 'block' : 'review'
  if (!term) return res.status(400).json({ error: 'invalid_term' })
  try {
    const result = await execute(
      'INSERT INTO moderation_terms (term, action) VALUES (?, ?)',
      [term, action],
    )
    invalidateModerationCache()
    res.status(201).json({ id: Number(result.insertId) })
  } catch {
    res.status(409).json({ error: 'term_exists' })
  }
})

app.delete('/api/admin/moderation/terms/:id', requireAuth, async (req, res) => {
  if (!canHandleReports(req.user)) return res.status(403).json({ error: 'forbidden' })
  await execute('DELETE FROM moderation_terms WHERE id = ?', [Number(req.params.id)])
  invalidateModerationCache()
  res.json({ ok: true })
})

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
  const settings = await moderationSettings()
  if (settings.emergencyStop) {
    return res.status(423).json({ error: 'moderation_closed', message: '内容发布暂时关闭。' })
  }
  const matched = await matchModeration(`${title}\n${content}`)
  if (matched?.action === 'block') return moderationBlockedResponse(res, matched.term)
  const autoApprove = canModerateBoard(req.user, boardId) && matched?.action !== 'review'
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
  if (autoApprove) await refreshForumActivity(req.user.id)
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
    const settings = await moderationSettings()
    if (settings.emergencyStop) {
      return res.status(423).json({ error: 'moderation_closed', message: '内容发布暂时关闭。' })
    }
    const matched = await matchModeration(content)
    if (matched?.action === 'block') return moderationBlockedResponse(res, matched.term)
    const autoApprove =
      matched?.action !== 'review' &&
      (canModerateBoard(req.user, Number(posts[0].board_id)) ||
        !settings.repliesRequireReview)
    const status = autoApprove ? 'approved' : 'pending'
    const result = await execute(
      `INSERT INTO forum_replies (post_id, author_id, parent_id, content, attachments, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [postId, req.user.id, validParent, content, JSON.stringify(attachments), status],
    )
    if (autoApprove && posts[0].author_id !== req.user.id) {
      await notify(
        posts[0].author_id,
        'reply',
        '你的帖子收到新回复',
        `${req.user.username}：${content.slice(0, 80) || '[图片]'}`,
        `/forum/post/${postId}`,
      )
    }
    if (autoApprove) await refreshForumActivity(req.user.id)
    res.status(201).json({
      id: Number(result.insertId),
      status,
      message: autoApprove ? '回复已发布' : '回复已提交，等待审核',
    })
  },
)

/** 帖主 / 版主删除帖子（软删除，管理员后台仍可见） */
app.delete('/api/forum/posts/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const rows = await query(
    'SELECT id, author_id, board_id, status FROM forum_posts WHERE id = ?',
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const allowed =
    rows[0].author_id === req.user.id ||
    hasForumAction(req.user, Number(rows[0].board_id), 'post.delete')
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  if (rows[0].status === 'deleted') return res.status(404).json({ error: 'not_found' })
  await execute(`UPDATE forum_posts SET status = 'deleted', pinned = 0 WHERE id = ?`, [id])
  await refreshForumActivity(Number(rows[0].author_id))
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
      'SELECT id, board_id, author_id, status FROM forum_posts WHERE id = ?',
      [id],
    )
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    const actionKey =
      action === 'hide' || action === 'restore'
        ? 'post.hide'
        : action === 'delete'
          ? 'post.delete'
          : 'post.pin'
    if (!hasForumAction(req.user, Number(rows[0].board_id), actionKey)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    if (rows[0].status === 'deleted') {
      return res.status(404).json({ error: 'not_found' })
    }
    if (action === 'hide') {
      await execute(`UPDATE forum_posts SET status = 'hidden' WHERE id = ?`, [id])
    } else if (action === 'restore') {
      if (rows[0].status !== 'hidden') {
        return res.status(409).json({ error: 'not_hidden' })
      }
      await execute(`UPDATE forum_posts SET status = 'approved' WHERE id = ?`, [id])
    } else if (action === 'pin') {
      await execute('UPDATE forum_posts SET pinned = 1 WHERE id = ?', [id])
    } else if (action === 'unpin') {
      await execute('UPDATE forum_posts SET pinned = 0 WHERE id = ?', [id])
    } else if (action === 'delete') {
      await execute(`UPDATE forum_posts SET status = 'deleted', pinned = 0 WHERE id = ?`, [id])
    } else {
      return res.status(400).json({ error: 'invalid_action' })
    }
    await refreshForumActivity(Number(rows[0].author_id))
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
    hasForumAction(req.user, Number(row.board_id), 'reply.delete')
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  await execute(`UPDATE forum_replies SET status = 'deleted' WHERE id = ?`, [id])
  await refreshForumActivity(Number(row.author_id))
  res.json({ ok: true })
})

// ============================================================
// 后台：论坛管理 + 审核
// ============================================================
app.get('/api/admin/forum/boards', requireAuth, requireForumAccess, async (req, res) => {
  const rows = await query(
    `SELECT b.*,
      (SELECT COUNT(*) FROM forum_posts p WHERE p.board_id = b.id AND p.status <> 'deleted') AS post_count,
      (SELECT COUNT(*) FROM forum_posts p WHERE p.board_id = b.id AND p.status = 'pending') AS pending_count,
      (SELECT MAX(p.created_at) FROM forum_posts p WHERE p.board_id = b.id AND p.status = 'approved') AS last_post_at
     FROM forum_boards b ORDER BY last_post_at DESC, b.id DESC`,
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
  const requestedAccess = ['public', 'special', 'core'].includes(req.body?.access)
    ? req.body.access
    : 'public'
  const roleClassValue = roleClass(req.user.identity)
  const canCreate =
    req.user.isSuper ||
    hasPermission(req.user, 'forum') ||
    ['senior', 'forum_master'].includes(req.user.identity) ||
    (['core_master', 'special_master', 'normal_master'].includes(req.user.identity) &&
      roleClassValue === requestedAccess)
  if (!canCreate) return res.status(403).json({ error: 'forbidden' })
  const name = asString(req.body?.name, 100)
  const slug = asString(req.body?.slug, 64).toLowerCase()
  const description = asString(req.body?.description, 500)
  const sort = Number(req.body?.sort) || 0
  const tags = Array.isArray(req.body?.tags)
    ? req.body.tags.map((tag) => asString(tag, 32)).filter(Boolean).slice(0, 8)
    : []
  const access = requestedAccess
  if (!name || !SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'invalid_input' })
  }
  const exists = await query('SELECT id FROM forum_boards WHERE slug = ?', [slug])
  if (exists.length) return res.status(409).json({ error: 'slug_taken' })
  const result = await execute(
    'INSERT INTO forum_boards (slug, name, description, access, sort, tags) VALUES (?, ?, ?, ?, ?, ?)',
    [slug, name, description, access, sort, JSON.stringify(tags)],
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
  if (req.body?.tags !== undefined) {
    patch.tags = JSON.stringify(
      Array.isArray(req.body.tags)
        ? req.body.tags.map((tag) => asString(tag, 32)).filter(Boolean).slice(0, 8)
        : [],
    )
  }
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

app.post('/api/admin/forum/boards/:id/deletion-request', requireAuth, requireForumAccess, async (req, res) => {
  const boardId = Number(req.params.id)
  const allowed =
    req.user.isSuper ||
    ['senior', 'forum_master'].includes(req.user.identity) ||
    canModerateBoard(req.user, boardId)
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  const boards = await query('SELECT name FROM forum_boards WHERE id = ?', [boardId])
  if (!boards.length) return res.status(404).json({ error: 'not_found' })
  const pending = await query(
    "SELECT id FROM forum_deletion_requests WHERE board_id = ? AND status = 'pending' LIMIT 1",
    [boardId],
  )
  if (pending.length) return res.status(409).json({ error: 'request_pending' })
  await execute(
    'INSERT INTO forum_deletion_requests (board_id, requester_id, approvals) VALUES (?, ?, ?)',
    [boardId, req.user.id, JSON.stringify([])],
  )
  const seniors = await query(
    "SELECT id FROM users WHERE is_super = 1 OR role_code = 'senior'",
  ).catch(() => [])
  for (const senior of seniors) {
    await notify(
      Number(senior.id),
      'forum',
      '论坛删除申请',
      `「${boards[0].name}」等待高级管理员审批（0/3）`,
      '/admin',
    ).catch(() => undefined)
  }
  res.status(201).json({ ok: true })
})

app.get('/api/admin/forum/deletion-requests', requireAuth, requireForumAccess, async (req, res) => {
  const rows = await query(
    `SELECT r.*, b.name AS board_name,
            COALESCE(NULLIF(u.nickname,''), u.username) AS requester,
            (SELECT COUNT(*) FROM forum_deletion_votes v WHERE v.request_id = r.id) AS vote_count
     FROM forum_deletion_requests r
     JOIN forum_boards b ON b.id = r.board_id
     JOIN users u ON u.id = r.requester_id
     ORDER BY r.id DESC LIMIT 100`,
  )
  const isSenior = req.user.isSuper || req.user.identity === 'senior'
  res.json({
    requests: rows
      .filter((row) => isSenior || canModerateBoard(req.user, Number(row.board_id)))
      .map((row) => {
        return {
          id: Number(row.id),
          boardId: Number(row.board_id),
          boardName: row.board_name,
          requester: row.requester,
          status: row.status,
          approvals: Number(row.vote_count ?? 0),
          createdAt: row.created_at,
          canVote: isSenior,
        }
      }),
  })
})

app.post('/api/admin/forum/deletion-requests/:id/vote', requireAuth, async (req, res) => {
  if (!(req.user.isSuper || req.user.identity === 'senior')) {
    return res.status(403).json({ error: 'senior_only' })
  }
  const id = Number(req.params.id)
  const approve = req.body?.approve === true
  const rows = await query(
    `SELECT r.*, b.name AS board_name FROM forum_deletion_requests r
     JOIN forum_boards b ON b.id = r.board_id WHERE r.id = ?`,
    [id],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  if (rows[0].status !== 'pending') return res.status(409).json({ error: 'already_reviewed' })
  let approvals = []
  await execute(
    'INSERT IGNORE INTO forum_deletion_votes (request_id, user_id) VALUES (?, ?)',
    [id, req.user.id],
  )
  const voteRows = await query(
    'SELECT COUNT(*) AS n FROM forum_deletion_votes WHERE request_id = ?',
    [id],
  )
  const voteCount = Number(voteRows[0]?.n ?? 0)
  if (!approve) {
    await execute(
      "UPDATE forum_deletion_requests SET status = 'rejected', vetoed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [req.user.id, id],
    )
    await notify(
      Number(rows[0].requester_id),
      'forum',
      '论坛删除申请被否决',
      `「${rows[0].board_name}」删除申请已被高级管理员否决`,
      '/admin',
    ).catch(() => undefined)
    return res.json({ ok: true, status: 'rejected' })
  }
  if (!approvals.some((item) => Number(item.userId) === req.user.id)) {
    approvals.push({ userId: req.user.id, at: new Date().toISOString() })
  }
  if (voteCount >= 3) {
    approvals = Array.from({ length: voteCount }, (_, index) => ({ userId: index + 1 }))
    await transaction(async (connection) => {
      await connection.execute(
        'DELETE r FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id WHERE p.board_id = ?',
        [Number(rows[0].board_id)],
      )
      await connection.execute('DELETE FROM forum_posts WHERE board_id = ?', [Number(rows[0].board_id)])
      await connection.execute('DELETE FROM forum_access_requests WHERE board_id = ?', [Number(rows[0].board_id)])
      await connection.execute('DELETE FROM forum_invites WHERE board_id = ?', [Number(rows[0].board_id)])
      await connection.execute('DELETE FROM forum_moderators WHERE board_id = ?', [Number(rows[0].board_id)])
      await connection.execute('DELETE FROM announcements WHERE board_id = ?', [Number(rows[0].board_id)])
      await connection.execute('DELETE FROM forum_boards WHERE id = ?', [Number(rows[0].board_id)])
      await connection.execute(
        "UPDATE forum_deletion_requests SET status = 'approved', approvals = ?, reviewed_at = NOW() WHERE id = ?",
        [JSON.stringify(approvals), id],
      )
    })
    await notify(
      Number(rows[0].requester_id),
      'forum',
      '论坛删除申请通过',
      `「${rows[0].board_name}」已被删除`,
      '/admin',
    ).catch(() => undefined)
    return res.json({ ok: true, status: 'approved' })
  }
  await execute('UPDATE forum_deletion_requests SET approvals = ? WHERE id = ?', [
    JSON.stringify(approvals),
    id,
  ])
  res.json({ ok: true, status: 'pending', approvals: voteCount })
})

app.delete('/api/admin/forum/boards/:id', requireAuth, requireForumAccess, async (req, res) => {
  if (!req.user.isSuper) {
    return res.status(409).json({ error: 'deletion_requires_approval' })
  }
  const id = Number(req.params.id)
  await transaction(async (connection) => {
    await connection.execute(
      'DELETE r FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id WHERE p.board_id = ?',
      [id],
    )
    await connection.execute('DELETE FROM forum_posts WHERE board_id = ?', [id])
    await connection.execute('DELETE FROM forum_access_requests WHERE board_id = ?', [id])
    await connection.execute('DELETE FROM forum_invites WHERE board_id = ?', [id])
    await connection.execute('DELETE FROM forum_moderators WHERE board_id = ?', [id])
    await connection.execute('DELETE FROM announcements WHERE board_id = ?', [id])
    await connection.execute(
      'DELETE v FROM forum_deletion_votes v JOIN forum_deletion_requests r ON r.id = v.request_id WHERE r.board_id = ?',
      [id],
    )
    await connection.execute('DELETE FROM forum_deletion_requests WHERE board_id = ?', [id])
    await connection.execute('DELETE FROM forum_boards WHERE id = ?', [id])
  })
  res.json({ ok: true })
})

app.get('/api/admin/forum/pending', requireAuth, requireForumAccess, async (req, res) => {
  const { page, limit, offset } = pageParams(req, 20)
  const posts = await query(
    `SELECT p.id, p.title, p.content, p.attachments, p.created_at,
            p.board_id, b.name AS board_name, COALESCE(NULLIF(u.nickname,''), u.username) AS author
     FROM forum_posts p
     JOIN forum_boards b ON b.id = p.board_id
     JOIN users u ON u.id = p.author_id
     WHERE p.status = 'pending' ORDER BY p.id ASC LIMIT ? OFFSET ?`,
    [limit, offset],
  )
  const replies = await query(
    `SELECT r.id, r.content, r.attachments, r.created_at,
            r.post_id, p.title AS post_title, p.board_id, b.name AS board_name, COALESCE(NULLIF(u.nickname,''), u.username) AS author
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
    await refreshForumActivity(Number(rows[0].author_id))
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
      `SELECT p.board_id, p.author_id AS post_author, p.title AS post_title,
              r.id AS reply_id, r.post_id, r.author_id
       FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id WHERE r.id = ?`,
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
    await refreshForumActivity(Number(rows[0].author_id))
    if (Number(rows[0].author_id) !== req.user.id) {
      await notify(
        Number(rows[0].author_id),
        'review',
        approve ? '回复已通过审核' : '回复未通过审核',
        note || rows[0].post_title,
        `/forum/post/${rows[0].post_id}`,
      )
    }
    if (approve && Number(rows[0].post_author) !== Number(rows[0].author_id)) {
      await notify(
        Number(rows[0].post_author),
        'reply',
        '你的帖子收到新回复',
        note || `回复已通过审核`,
        `/forum/post/${rows[0].post_id}`,
      )
    }
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
              COALESCE(NULLIF(u.nickname,''), u.username) AS author,
              (SELECT COUNT(*) FROM forum_replies r
               WHERE r.post_id = p.id AND r.status = 'approved') AS reply_count
       FROM forum_posts p JOIN users u ON u.id = p.author_id
       WHERE p.board_id = ? AND p.status <> 'deleted'
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
// 论坛头衔与活跃等级
// ============================================================
app.get(
  '/api/admin/forum/users',
  requireAuth,
  requireForumAccess,
  async (_req, res) => {
    const users = await query(
      `SELECT id, username, nickname, role_code, forum_title, forum_title_locked,
              forum_points, forum_level
       FROM users WHERE status = 'active' ORDER BY forum_points DESC, id ASC LIMIT 500`,
    )
    res.json({
      users: users.map((user) => ({
        id: Number(user.id),
        username: user.username,
        nickname: user.nickname || user.username,
        identity: user.role_code,
        forumTitle: user.forum_title ?? '',
        forumTitleLocked: Boolean(user.forum_title_locked),
        forumPoints: Number(user.forum_points ?? 0),
        forumLevel: Number(user.forum_level ?? 0),
      })),
    })
  },
)

app.get(
  '/api/admin/forum/title-rules',
  requireAuth,
  requireForumAccess,
  async (_req, res) => {
    const rules = await query(
      'SELECT id, level, min_points AS minPoints, title FROM forum_title_rules ORDER BY min_points ASC, level ASC',
    )
    res.json({ rules })
  },
)

app.put(
  '/api/admin/forum/title-rules',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const input = Array.isArray(req.body?.rules) ? req.body.rules : []
    const rules = input
      .map((rule) => ({
        level: Math.max(1, Math.min(99, Number(rule?.level) || 0)),
        minPoints: Math.max(0, Math.min(1000000, Number(rule?.minPoints) || 0)),
        title: asString(rule?.title, 64),
      }))
      .filter((rule) => rule.level && rule.title)
      .slice(0, 30)
    if (rules.length !== input.length) {
      return res.status(400).json({ error: 'invalid_rules' })
    }
    await transaction(async (connection) => {
      await connection.execute('DELETE FROM forum_title_rules')
      for (const rule of rules) {
        await connection.execute(
          'INSERT INTO forum_title_rules (level, min_points, title) VALUES (?, ?, ?)',
          [rule.level, rule.minPoints, rule.title],
        )
      }
    })
    const users = await query("SELECT id FROM users WHERE status = 'active'")
    for (const user of users) await refreshForumActivity(Number(user.id))
    res.json({ ok: true })
  },
)

app.post(
  '/api/admin/forum/users/:id/title',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const id = Number(req.params.id)
    const title = asString(req.body?.title, 64)
    const locked = req.body?.locked !== false && Boolean(title)
    const rows = await query('SELECT id FROM users WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'not_found' })
    await execute('UPDATE users SET forum_title = ?, forum_title_locked = ? WHERE id = ?', [
      title,
      locked ? 1 : 0,
      id,
    ])
    if (!locked) await refreshForumActivity(id)
    await notify(id, 'permission', '论坛头衔已更新', title || '已恢复自动等级头衔', '/profile')
    res.json({ ok: true })
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
      `SELECT p.*, b.name AS board_name, COALESCE(NULLIF(u.nickname,''), u.username) AS author
       FROM forum_posts p
       JOIN forum_boards b ON b.id = p.board_id
       JOIN users u ON u.id = p.author_id
       WHERE p.id = ? AND p.status <> 'deleted'`,
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
  await execute(
    `UPDATE forum_access_requests
     SET escalated_at = NOW(), escalation_level = 1
     WHERE status = 'pending' AND escalation_level = 0
       AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
  ).catch(() => undefined)
  await execute(
    `UPDATE forum_access_requests
     SET escalation_level = 2, escalation_notified = 0
     WHERE status = 'pending' AND escalation_level = 1
       AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)`,
  ).catch(() => undefined)
  const escalated = await query(
    `SELECT r.id, r.user_id, b.name AS board_name
     FROM forum_access_requests r JOIN forum_boards b ON b.id = r.board_id
     WHERE r.status = 'pending' AND r.escalated_at IS NOT NULL
       AND r.escalation_notified = 0`,
  ).catch(() => [])
  const globalAdmins = await query(
    "SELECT id FROM users WHERE is_super = 1 OR role_code IN ('senior','forum_master')",
  ).catch(() => [])
  for (const request of escalated.slice(0, 20)) {
    for (const admin of globalAdmins) {
      await notify(
        Number(admin.id),
        'access',
        '论坛访问申请已升级',
        `「${request.board_name}」有超过 1 小时未处理的申请`,
        '/admin',
      ).catch(() => undefined)
    }
    await execute('UPDATE forum_access_requests SET escalation_notified = 1 WHERE id = ?', [
      Number(request.id),
    ]).catch(() => undefined)
  }
  const rows = await query(
    `SELECT r.*, b.name AS board_name, b.access,
            COALESCE(NULLIF(u.nickname,''), u.username) AS username
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
        escalated: Boolean(row.escalated_at),
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
    const globalForumAdmin =
      req.user.isSuper || ['senior', 'forum_master'].includes(req.user.identity)
    if (!globalForumAdmin && !canModerateBoard(req.user, Number(rows[0].board_id))) {
      return res.status(403).json({ error: 'forbidden' })
    }
    await execute(
      `UPDATE forum_access_requests
       SET status = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [approve ? 'approved' : 'rejected', req.user.id, id],
    )
    if (approve) {
      await execute(
        `UPDATE forum_access_requests
         SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW()
         WHERE board_id = ? AND user_id = ? AND id <> ? AND status = 'pending'`,
        [req.user.id, Number(rows[0].board_id), Number(rows[0].user_id), id],
      ).catch(() => undefined)
    }
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
// 板块管理员绑定（总管理员 1 位 / 管理员 4 位 / 每人最多 4 个板块）
// ============================================================
app.get('/api/admin/forum/moderators', requireAuth, requireForumAccess, async (req, res) => {
  const rows = await query(
    `SELECT m.*, b.name AS board_name, b.access,
            COALESCE(NULLIF(u.nickname,''), u.username) AS username
     FROM forum_moderators m
     JOIN forum_boards b ON b.id = m.board_id
     JOIN users u ON u.id = m.user_id
     ORDER BY m.board_id ASC, m.role DESC, m.id ASC`,
  )
  const visible = rows.filter(
    (row) =>
      req.user.isSuper ||
      ['senior', 'forum_master'].includes(req.user.identity) ||
      canModerateBoard(req.user, Number(row.board_id)),
  )
  res.json({
    moderators: visible.map((row) => ({
      id: Number(row.id),
      boardId: Number(row.board_id),
      boardName: row.board_name,
      access: row.access,
      userId: Number(row.user_id),
      username: row.username,
      role: row.role,
      createdAt: row.created_at,
    })),
  })
})

app.post('/api/admin/forum/moderators', requireAuth, requireForumAccess, async (req, res) => {
  const boardId = Number(req.body?.boardId)
  const userId = Number(req.body?.userId)
  const role = req.body?.role === 'master' ? 'master' : 'admin'
  const boards = await query('SELECT * FROM forum_boards WHERE id = ?', [boardId])
  if (!boards.length) return res.status(404).json({ error: 'board_not_found' })
  const allowed =
    req.user.isSuper ||
    ['senior', 'forum_master'].includes(req.user.identity) ||
    canModerateBoard(req.user, boardId)
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  const users = await query('SELECT id FROM users WHERE id = ?', [userId])
  if (!users.length) return res.status(404).json({ error: 'user_not_found' })

  const existing = await query(
    'SELECT * FROM forum_moderators WHERE board_id = ? AND user_id = ?',
    [boardId, userId],
  )
  if (existing.length) return res.status(409).json({ error: 'already_moderator' })
  if (role === 'master') {
    const masters = await query(
      "SELECT id FROM forum_moderators WHERE board_id = ? AND role = 'master' LIMIT 1",
      [boardId],
    )
    if (masters.length) return res.status(409).json({ error: 'master_limit' })
  } else {
    const admins = await query(
      "SELECT COUNT(*) AS n FROM forum_moderators WHERE board_id = ? AND role = 'admin'",
      [boardId],
    )
    if (Number(admins[0]?.n ?? 0) >= 4) return res.status(409).json({ error: 'admin_limit' })
  }
  const count = await query(
    'SELECT COUNT(*) AS n FROM forum_moderators WHERE user_id = ?',
    [userId],
  )
  if (Number(count[0]?.n ?? 0) >= 4) return res.status(409).json({ error: 'board_limit' })

  await execute(
    'INSERT INTO forum_moderators (board_id, user_id, role) VALUES (?, ?, ?)',
    [boardId, userId, role],
  )
  const userRows = await query('SELECT permissions FROM users WHERE id = ?', [userId])
  let permissions = []
  try {
    permissions = JSON.parse(userRows[0]?.permissions ?? '[]')
  } catch {
    permissions = []
  }
  if (!permissions.includes(`forum.${boardId}`)) {
    permissions.push(`forum.${boardId}`)
    await execute('UPDATE users SET permissions = ? WHERE id = ?', [
      JSON.stringify(permissions),
      userId,
    ])
  }
  await notify(
    userId,
    'permission',
    '论坛管理授权',
    `你已被授权管理「${boards[0].name}」`,
    '/admin',
  )
  res.status(201).json({ ok: true })
})

app.delete('/api/admin/forum/moderators/:id', requireAuth, requireForumAccess, async (req, res) => {
  const rows = await query('SELECT * FROM forum_moderators WHERE id = ?', [
    Number(req.params.id),
  ])
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const boardId = Number(rows[0].board_id)
  const allowed =
    req.user.isSuper ||
    ['senior', 'forum_master'].includes(req.user.identity) ||
    canModerateBoard(req.user, boardId)
  if (!allowed) return res.status(403).json({ error: 'forbidden' })
  await execute('DELETE FROM forum_moderators WHERE id = ?', [Number(req.params.id)])
  const remaining = await query(
    'SELECT id FROM forum_moderators WHERE user_id = ? AND board_id = ? LIMIT 1',
    [Number(rows[0].user_id), boardId],
  )
  if (!remaining.length) {
    const userRows = await query('SELECT permissions FROM users WHERE id = ?', [
      Number(rows[0].user_id),
    ])
    let permissions = []
    try {
      permissions = JSON.parse(userRows[0]?.permissions ?? '[]')
    } catch {
      permissions = []
    }
    await execute('UPDATE users SET permissions = ? WHERE id = ?', [
      JSON.stringify(permissions.filter((p) => p !== `forum.${boardId}`)),
      Number(rows[0].user_id),
    ])
  }
  res.json({ ok: true })
})

// ============================================================
// 核心论坛邀请
// ============================================================
app.post(
  '/api/admin/forum/boards/:id/invite',
  requireAuth,
  requireForumAccess,
  async (req, res) => {
    const boardId = Number(req.params.id)
    const userId = Number(req.body?.userId)
    const boards = await query('SELECT * FROM forum_boards WHERE id = ?', [boardId])
    if (!boards.length) return res.status(404).json({ error: 'not_found' })
    if (boards[0].access !== 'core') {
      return res.status(400).json({ error: 'not_core_board' })
    }
    const allowed =
      req.user.isSuper ||
      ['senior', 'forum_master'].includes(req.user.identity) ||
      canModerateBoard(req.user, boardId)
    if (!allowed) return res.status(403).json({ error: 'forbidden' })
    const users = await query('SELECT id FROM users WHERE id = ?', [userId])
    if (!users.length) return res.status(404).json({ error: 'user_not_found' })
    await execute(
      `INSERT INTO forum_invites (board_id, user_id, invited_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE invited_by = VALUES(invited_by), created_at = NOW()`,
      [boardId, userId, req.user.id],
    )
    await notify(
      userId,
      'access',
      '核心论坛邀请',
      `你已被邀请进入「${boards[0].name}」`,
      `/forum/${boards[0].slug}`,
    )
    res.status(201).json({ ok: true })
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

app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
  await execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [
    Number(req.params.id),
    req.user.id,
  ])
  res.json({ ok: true })
})

app.delete('/api/notifications', requireAuth, async (req, res) => {
  if (String(req.query.scope ?? '') === 'read') {
    await execute(
      'DELETE FROM notifications WHERE user_id = ? AND read_at IS NOT NULL',
      [req.user.id],
    )
  } else {
    await execute('DELETE FROM notifications WHERE user_id = ?', [req.user.id])
  }
  res.json({ ok: true })
})
// ============================================================
async function areFriends(firstId, secondId) {
  const rows = await query(
    `SELECT 1 FROM follows f1
     JOIN follows f2
       ON f2.follower_id = f1.following_id
      AND f2.following_id = f1.follower_id
     WHERE f1.follower_id = ? AND f1.following_id = ? LIMIT 1`,
    [firstId, secondId],
  )
  return rows.length > 0
}

async function isBlockedBetween(firstId, secondId) {
  const rows = await query(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
    [firstId, secondId, secondId, firstId],
  )
  return rows.length > 0
}

app.get('/api/friends', requireAuth, async (req, res) => {
  const userId = req.user.id
  const rows = await query(
    `SELECT u.id, u.username, u.nickname, u.avatar_url,
            (SELECT COUNT(*) FROM direct_messages dm
              WHERE dm.receiver_id = ? AND dm.sender_id = u.id AND dm.read_at IS NULL) AS unread
     FROM follows f1
     JOIN follows f2
       ON f2.follower_id = f1.following_id
      AND f2.following_id = f1.follower_id
     JOIN users u ON u.id = f1.following_id
     WHERE f1.follower_id = ? AND u.status = 'active'
     ORDER BY unread DESC, u.id DESC LIMIT 100`,
    [userId, userId],
  )
  const friends = []
  for (const row of rows) {
    const last = await query(
      `SELECT id, sender_id, content, created_at FROM direct_messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY id DESC LIMIT 1`,
      [userId, Number(row.id), Number(row.id), userId],
    )
    friends.push({
      id: Number(row.id),
      username: row.nickname || row.username,
      account: row.username,
      avatarUrl: row.avatar_url ?? '',
      unread: Number(row.unread),
      last: last.length
        ? {
            id: Number(last[0].id),
            content: last[0].content.slice(0, 80),
            createdAt: last[0].created_at,
            fromMe: Number(last[0].sender_id) === userId,
          }
        : null,
    })
  }
  res.json({ friends })
})

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
  const followRows = await query(
    'SELECT following_id FROM follows WHERE follower_id = ?',
    [userId],
  )
  const followingIds = new Set(
    followRows.map((row) => Number(row.following_id)),
  )
  const conversations = []
  for (const row of rows) {
    const otherId = Number(row.other_id)
    const users = await query(
      'SELECT id, username, nickname, avatar_url FROM users WHERE id = ?',
      [otherId],
    )
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
        username: users[0].nickname || users[0].username,
        avatarUrl: users[0].avatar_url ?? '',
        isFollowing: followingIds.has(otherId),
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
  const users = await query(
    'SELECT id, username, nickname, avatar_url FROM users WHERE id = ?',
    [otherId],
  )
  if (!users.length) return res.status(404).json({ error: 'not_found' })
  if (!(await areFriends(req.user.id, otherId))) {
    return res.status(403).json({ error: 'not_friends' })
  }
  if (await isBlockedBetween(req.user.id, otherId)) {
    return res.status(403).json({ error: 'blocked' })
  }
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
  const followRows = await query(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
    [req.user.id, otherId],
  )
  res.json({
    user: {
      id: otherId,
      username: users[0].nickname || users[0].username,
      avatarUrl: users[0].avatar_url ?? '',
      isFollowing: followRows.length > 0,
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
  if (!(await areFriends(req.user.id, toId))) {
    return res.status(403).json({ error: 'not_friends' })
  }
  if (await isBlockedBetween(req.user.id, toId)) {
    return res.status(403).json({ error: 'blocked' })
  }
  if (!rateLimit(`dm:${req.user.id}`, 60 * 1000, 30)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }
  const settings = await moderationSettings()
  if (settings.emergencyStop) {
    return res.status(423).json({ error: 'moderation_closed', message: '私信暂时关闭。' })
  }
  const matched = await matchModeration(content)
  if (matched) {
    await auditRequest(req, {
      action: 'moderation.dm_blocked',
      targetType: 'user',
      targetId: toId,
      status: 422,
      detail: { term: matched.term, rule: matched.action },
    })
    return moderationBlockedResponse(res, matched.term)
  }
  const result = await execute(
    'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
    [req.user.id, toId, content],
  )
  await notify(
    toId,
    'dm',
    '收到新私信',
    content.slice(0, 120),
    `/messages?with=${req.user.id}&message=${result.insertId}`,
  )
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
  if (req.body?.nickname !== undefined) {
    const nickname = asString(req.body.nickname, 64)
    if (nickname.length < 2) {
      return res.status(400).json({ error: 'invalid_nickname' })
    }
    patch.nickname = nickname
  }
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
  const followers = await query(
    'SELECT COUNT(*) AS n FROM follows WHERE following_id = ?',
    [id],
  )
  const following = await query(
    'SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?',
    [id],
  )
  let isFollowing = false
  if (req.user && !self) {
    const rowsFollow = await query(
      'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
      [req.user.id, id],
    )
    isFollowing = rowsFollow.length > 0
  }
  const posts = await query(
    `SELECT p.id, p.title, p.created_at, b.slug AS board_slug, b.name AS board_name
     FROM forum_posts p JOIN forum_boards b ON b.id = p.board_id
     WHERE p.author_id = ? AND p.status = 'approved'
     ORDER BY p.created_at DESC LIMIT 20`,
    [id],
  )
  res.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      tags: user.tags,
      role: roleLabel(user),
      gender: self || req.user?.isSuper ? user.gender : '',
      birthday: self || req.user?.isSuper ? user.birthday : '',
      createdAt: user.createdAt,
      banned: banActive(user),
      followers: Number(followers[0].n),
      following: Number(following[0].n),
      isFollowing,
    },
    posts: posts.map((post) => ({
      id: Number(post.id),
      title: post.title,
      createdAt: post.created_at,
      board: { slug: post.board_slug, name: post.board_name },
    })),
  })
})

app.get('/api/users/:id/block', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id)
  if (!targetId) return res.status(400).json({ error: 'invalid_input' })
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?) AS mine,
       (SELECT COUNT(*) FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?) AS theirs`,
    [req.user.id, targetId, targetId, req.user.id],
  )
  res.json({
    blockedByMe: Number(rows[0]?.mine ?? 0) > 0,
    blockedMe: Number(rows[0]?.theirs ?? 0) > 0,
  })
})

app.post('/api/users/:id/block', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id)
  if (!targetId || targetId === req.user.id) {
    return res.status(400).json({ error: 'invalid_input' })
  }
  await execute(
    'INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)',
    [req.user.id, targetId],
  )
  res.json({ ok: true })
})

app.delete('/api/users/:id/block', requireAuth, async (req, res) => {
  await execute(
    'DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
    [req.user.id, Number(req.params.id)],
  )
  res.json({ ok: true })
})

app.post('/api/users/:id/follow', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id)
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'cannot_follow_self' })
  }
  const target = await query('SELECT id, nickname, username FROM users WHERE id = ?', [
    targetId,
  ])
  if (!target.length) return res.status(404).json({ error: 'not_found' })
  await execute(
    'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
    [req.user.id, targetId],
  )
  const reverse = await query(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
    [targetId, req.user.id],
  )
  if (reverse.length) {
    await notify(
      targetId,
      'friend',
      '你们成为好友了',
      `${req.user.nickname || req.user.username} 与你互相关注，现在可以私信`,
      `/messages?with=${req.user.id}`,
    )
    await notify(
      req.user.id,
      'friend',
      '你们成为好友了',
      `你与 ${target[0].nickname || target[0].username} 互相关注，现在可以私信`,
      `/messages?with=${targetId}`,
    )
  }
  await notify(
    targetId,
    'follow',
    '有人关注了你',
    `${req.user.nickname || req.user.username} 关注了你`,
    `/u/${req.user.id}`,
  )
  res.json({ ok: true })
})

app.delete('/api/users/:id/follow', requireAuth, async (req, res) => {
  await execute(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
    [req.user.id, Number(req.params.id)],
  )
  res.json({ ok: true })
})

app.get('/api/users/:id/followers', async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.username, u.nickname, u.avatar_url
     FROM follows f JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = ? ORDER BY f.created_at DESC LIMIT 100`,
    [Number(req.params.id)],
  )
  res.json({
    users: rows.map((row) => ({
      id: Number(row.id),
      username: row.username,
      nickname: row.nickname || row.username,
      avatarUrl: row.avatar_url ?? '',
    })),
  })
})

app.get('/api/users/:id/following', async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.username, u.nickname, u.avatar_url
     FROM follows f JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100`,
    [Number(req.params.id)],
  )
  res.json({
    users: rows.map((row) => ({
      id: Number(row.id),
      username: row.username,
      nickname: row.nickname || row.username,
      avatarUrl: row.avatar_url ?? '',
    })),
  })
})

// ============================================================
// 概览
// ============================================================
app.get('/api/admin/overview', requireAuth, requireStaff, async (req, res) => {
  const user = req.user
  const canForum = user.isSuper || user.permissions.some(isForumPermission)
  const canMembers =
    user.isSuper ||
    user.permissions.includes('members.manage') ||
    user.permissions.includes('members.grant')
  const canGuestbook = hasPermission(user, 'guestbook')

  const tasks = []
  const addCount = (key, sql) => tasks.push([key, query(sql)])
  if (hasPermission(user, 'archive.articles')) addCount('articles', 'SELECT COUNT(*) AS n FROM articles')
  if (hasPermission(user, 'archive.photos')) addCount('photos', 'SELECT COUNT(*) AS n FROM photos')
  if (hasPermission(user, 'archive.videos')) addCount('videos', 'SELECT COUNT(*) AS n FROM videos')
  if (hasPermission(user, 'logs')) addCount('logs', 'SELECT COUNT(*) AS n FROM logs')
  if (canForum) {
    addCount('pendingPosts', `SELECT COUNT(*) AS n FROM forum_posts WHERE status = 'pending'`)
    addCount('pendingReplies', `SELECT COUNT(*) AS n FROM forum_replies WHERE status = 'pending'`)
    addCount('boards', 'SELECT COUNT(*) AS n FROM forum_boards')
    addCount('posts', `SELECT COUNT(*) AS n FROM forum_posts WHERE status <> 'deleted'`)
    addCount('replies', `SELECT COUNT(*) AS n FROM forum_replies WHERE status <> 'deleted'`)
  }
  if (canMembers) addCount('users', 'SELECT COUNT(*) AS n FROM users')
  if (canGuestbook) addCount('messages', 'SELECT COUNT(*) AS n FROM guest_messages')

  const countEntries = await Promise.all(
    tasks.map(async ([key, promise]) => [key, Number((await promise)[0].n)]),
  )
  const counts = Object.fromEntries(countEntries)

  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`
  })

  const sinceSql = 'DATE_SUB(CURDATE(), INTERVAL 6 DAY)'
  const [userDays, postDays, replyDays, messageDays] = await Promise.all([
    canMembers
      ? query(
          `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS n
           FROM users WHERE created_at >= ${sinceSql} GROUP BY day`,
        )
      : Promise.resolve([]),
    canForum
      ? query(
          `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS n
           FROM forum_posts WHERE created_at >= ${sinceSql} GROUP BY day`,
        )
      : Promise.resolve([]),
    canForum
      ? query(
          `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS n
           FROM forum_replies WHERE created_at >= ${sinceSql} GROUP BY day`,
        )
      : Promise.resolve([]),
    canGuestbook
      ? query(
          `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS n
           FROM guest_messages WHERE created_at >= ${sinceSql} GROUP BY day`,
        )
      : Promise.resolve([]),
  ])

  const asMap = (rows) => new Map(rows.map((row) => [String(row.day).slice(0, 10), Number(row.n)]))
  const userMap = asMap(userDays)
  const postMap = asMap(postDays)
  const replyMap = asMap(replyDays)
  const messageMap = asMap(messageDays)

  const timeline = dayKeys.map((day) => ({
    date: day.slice(5),
    users: userMap.get(day) ?? 0,
    posts: postMap.get(day) ?? 0,
    replies: replyMap.get(day) ?? 0,
    messages: messageMap.get(day) ?? 0,
  }))

  const [postStatusRows, userRoleRows, boardRows] = await Promise.all([
    canForum
      ? query('SELECT status, COUNT(*) AS n FROM forum_posts GROUP BY status')
      : Promise.resolve([]),
    canMembers
      ? query('SELECT is_super, permissions FROM users')
      : Promise.resolve([]),
    canForum
      ? query(
          `SELECT b.name, COUNT(p.id) AS n
           FROM forum_boards b LEFT JOIN forum_posts p ON p.board_id = b.id
           GROUP BY b.id, b.name ORDER BY n DESC LIMIT 5`,
        )
      : Promise.resolve([]),
  ])

  const usersByRole = {}
  for (const row of userRoleRows) {
    const role = roleLabel(normalizeUser(row))
    usersByRole[role] = (usersByRole[role] ?? 0) + 1
  }

  res.json({
    counts,
    role: roleLabel(user),
    timeline,
    postsByStatus: Object.fromEntries(
      postStatusRows.map((row) => [row.status, Number(row.n)]),
    ),
    usersByRole,
    topBoards: boardRows.map((row) => ({ name: row.name, count: Number(row.n) })),
    generatedAt: new Date().toISOString(),
  })
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

// ---------- 自定义主题 ----------
app.get('/api/themes', async (_req, res) => {
  const rows = await query(
    'SELECT id, name, primary_color, primary_name, secondary_color, secondary_name, tertiary_color, tertiary_name, created_at FROM site_themes ORDER BY id ASC',
  )
  res.json({ themes: rows })
})

function canManageThemes(user) {
  return Boolean(
    user?.isSuper ||
      ['super', 'senior', 'admin'].includes(user?.identity) ||
      user?.permissions?.includes('members.manage') ||
      user?.permissions?.includes('access_logs'),
  )
}

app.post('/api/admin/themes', requireAuth, async (req, res) => {
  if (!canManageThemes(req.user)) return res.status(403).json({ error: 'forbidden' })
  const name = asString(req.body?.name, 80)
  const color = (value) => (/^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '')
  const primary = color(req.body?.primaryColor)
  const secondary = color(req.body?.secondaryColor)
  const tertiary = color(req.body?.tertiaryColor)
  if (!name || !primary || !secondary || !tertiary) {
    return res.status(400).json({ error: 'invalid_theme' })
  }
  const result = await execute(
    `INSERT INTO site_themes
      (name, primary_color, primary_name, secondary_color, secondary_name, tertiary_color, tertiary_name, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      primary,
      asString(req.body?.primaryName, 40),
      secondary,
      asString(req.body?.secondaryName, 40),
      tertiary,
      asString(req.body?.tertiaryName, 40),
      req.user.id,
    ],
  )
  res.status(201).json({ id: Number(result.insertId) })
})

app.delete('/api/admin/themes/:id', requireAuth, async (req, res) => {
  if (!canManageThemes(req.user)) return res.status(403).json({ error: 'forbidden' })
  await execute('DELETE FROM site_themes WHERE id = ?', [Number(req.params.id)])
  res.json({ ok: true })
})

// ---------- 安全日志（请求日志 / 审计日志） ----------
function canManageSecurityLogs(user) {
  return Boolean(
    user?.isSuper ||
      ['super', 'senior', 'admin'].includes(user?.identity) ||
      user?.permissions?.includes('access_logs') ||
      user?.permissions?.includes('security.readonly') ||
      user?.permissions?.includes('members.manage'),
  )
}

function securityLogFilters(req) {
  const clauses = []
  const params = []
  const q = asString(req.query.q, 120)
  if (q) {
    const like = `%${q.replace(/[%_]/g, '\\$&')}%`
    clauses.push('(path LIKE ? OR username LIKE ? OR ip LIKE ? OR request_id LIKE ?)')
    params.push(like, like, like, like)
  }
  const method = asString(req.query.method, 12).toUpperCase()
  if (method) {
    clauses.push('method = ?')
    params.push(method)
  }
  if (req.query.status !== undefined && req.query.status !== '') {
    const status = Number(req.query.status)
    if (Number.isInteger(status)) {
      clauses.push('status = ?')
      params.push(status)
    }
  }
  const from = asDate(req.query.from)
  if (from) {
    clauses.push('created_at >= ?')
    params.push(`${from} 00:00:00`)
  }
  const to = asDate(req.query.to)
  if (to) {
    clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)')
    params.push(`${to} 00:00:00`)
  }
  return { where: clauses.length ? clauses.join(' AND ') : '1=1', params }
}

app.get(
  '/api/admin/security/request-logs',
  requireAuth,
  async (req, res) => {
    if (!canManageSecurityLogs(req.user)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    const { page, limit, offset } = pageParams(req, 30)
    const { where, params } = securityLogFilters(req)
    const count = await query(
      `SELECT COUNT(*) AS total FROM request_logs WHERE ${where}`,
      params,
    )
    const rows = await query(
      `SELECT id, request_id, user_id, username, method, path, query_keys, status,
              duration_ms, ip, remote_port, target_host, target_port, user_agent,
              device_hash, created_at
       FROM request_logs WHERE ${where}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    res.json({
      logs: rows,
      pagination: { page, limit, total: Number(count[0]?.total ?? 0) },
      retentionDays: 180,
      canDelete: false,
    })
  },
)

app.get(
  '/api/admin/security/audit-logs',
  requireAuth,
  async (req, res) => {
    if (!canManageSecurityLogs(req.user)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    const { page, limit, offset } = pageParams(req, 30)
    const clauses = []
    const params = []
    const q = asString(req.query.q, 120)
    if (q) {
      const like = `%${q.replace(/[%_]/g, '\\$&')}%`
      clauses.push(
        '(action LIKE ? OR actor_username LIKE ? OR path LIKE ? OR ip LIKE ? OR target_id LIKE ? OR target_label LIKE ?)',
      )
      params.push(like, like, like, like, like, like)
    }
    const action = asString(req.query.action, 120)
    if (action) {
      clauses.push('action = ?')
      params.push(action)
    }
    if (req.query.status !== undefined && req.query.status !== '') {
      const status = Number(req.query.status)
      if (Number.isInteger(status)) {
        clauses.push('status = ?')
        params.push(status)
      }
    }
    const from = asDate(req.query.from)
    if (from) {
      clauses.push('created_at >= ?')
      params.push(`${from} 00:00:00`)
    }
    const to = asDate(req.query.to)
    if (to) {
      clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)')
      params.push(`${to} 00:00:00`)
    }
    const where = clauses.length ? clauses.join(' AND ') : '1=1'
    const count = await query(
      `SELECT COUNT(*) AS total FROM security_audit_logs WHERE ${where}`,
      params,
    )
    const rows = await query(
      `SELECT id, request_id, actor_id, actor_username, action, target_type,
              target_id, target_label, method, path, status, ip, user_agent,
              detail, prev_hash, entry_hash, created_at, occurred_at
       FROM security_audit_logs WHERE ${where}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    res.json({
      logs: rows,
      pagination: { page, limit, total: Number(count[0]?.total ?? 0) },
      immutable: true,
      canDelete: false,
    })
  },
)

// 旧版“模块访问”记录：保留写入与只读查询，但不再提供删除入口。
app.post('/api/access-logs', requireAuth, async (req, res) => {
  const moduleType = asString(req.body?.moduleType, 32)
  if (!moduleType) return res.status(400).json({ error: 'module_required' })
  const targetType = asString(req.body?.targetType, 32)
  const targetId = asString(req.body?.targetId, 64)
  const targetTitle = asString(req.body?.targetTitle, 200)
  await execute(
    `INSERT INTO access_logs
      (user_id, username, module_type, target_type, target_id, target_title, ip, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 180 DAY))`,
    [req.user.id, req.user.username, moduleType, targetType, targetId, targetTitle, clientIp(req)],
  )
  res.status(201).json({ ok: true })
})

app.get('/api/admin/access-logs', requireAuth, async (req, res) => {
  if (!canManageSecurityLogs(req.user)) return res.status(403).json({ error: 'forbidden' })
  const rows = await query(
    `SELECT id, username, module_type, target_type, target_id, target_title, ip,
            created_at, expires_at, TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS remaining_seconds
     FROM access_logs ORDER BY created_at DESC LIMIT 500`,
  )
  res.json({ logs: rows, canDelete: false, immutable: true })
})

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
