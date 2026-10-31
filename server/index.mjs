/**
 * RHINE//HOME 后端
 * ------------------------------------------------------------
 * 功能：
 *  - 管理后台鉴权（登录 / 会话令牌 / 模块权限）
 *  - 文章、日志、照片、视频的增删改查
 *  - 文件上传（附件 / 照片 / 视频），照片自动读取 EXIF 拍摄日期
 *  - 留言板接口
 *  - 生产环境直接托管 dist 静态站点 + /uploads
 *
 * 运行：
 *   cd server && npm install && npm start
 * 存储：
 *   配置 DB_HOST 等环境变量 → MySQL；否则使用 server/data/*.json
 */
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as exifrNamespace from 'exifr'
import { createStore } from './store.mjs'
import { hashPassword, verifyPassword, newToken, PERMISSIONS } from './auth.mjs'

// exifr 是 CommonJS 包，ESM 下只有 default 导出
const exifr = exifrNamespace.default ?? exifrNamespace

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3001)
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, 'uploads')
const DIST_DIR = path.resolve(__dirname, '..', 'dist')
const TOKEN_TTL = 12 * 60 * 60 * 1000
const UPLOAD_KINDS = new Set(['file', 'photo', 'video'])

const { mode, store } = await createStore()
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// ---------- 初始管理员 ----------
async function ensureAdmin() {
  if ((await store.users.count()) > 0) return
  const username = process.env.ADMIN_USER ?? 'admin'
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
  await store.users.create({
    username,
    passwordHash: hashPassword(password),
    role: 'owner',
    permissions: [...PERMISSIONS],
  })
  console.log(
    `[admin] 已创建初始管理员 ${username} / ${password}（生产环境请用 ADMIN_USER / ADMIN_PASSWORD 覆盖，登录后修改密码）`,
  )
}
await ensureAdmin()

const app = express()
app.set('trust proxy', 1)
if (process.env.CORS_ORIGIN) {
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    }),
  )
}
app.use(compression())
app.use(express.json({ limit: '4mb' }))

// ---------- 会话 ----------
const sessions = new Map()

function createSession(userId) {
  const token = newToken()
  sessions.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL })
  return token
}

setInterval(
  () => {
    const now = Date.now()
    for (const [token, session] of sessions) {
      if (session.expiresAt < now) sessions.delete(token)
    }
  },
  10 * 60 * 1000,
).unref()

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  permissions: user.permissions ?? [],
})

const hasPermission = (user, permission) =>
  user.role === 'owner' || (user.permissions ?? []).includes(permission)

/** 登录失败限流（每 IP 5 分钟内 10 次） */
const loginAttempts = new Map()
function tooManyAttempts(ip) {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 })
    return false
  }
  record.count += 1
  return record.count > 10
}

// ---------- 中间件 ----------
async function authenticate(req, res, next) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const user = await store.users.get(session.userId)
  if (!user) {
    sessions.delete(token)
    return res.status(401).json({ error: 'unauthorized' })
  }
  req.user = user
  req.token = token
  next()
}

const requirePermission = (permission) => (req, res, next) => {
  if (hasPermission(req.user, permission)) return next()
  res.status(403).json({ error: 'forbidden' })
}

const requireOwnerOrMembers = (req, res, next) => {
  if (req.user.role === 'owner' || hasPermission(req.user, 'members')) {
    return next()
  }
  res.status(403).json({ error: 'forbidden' })
}

// ---------- 数据清洗 ----------
const asString = (value, max = 500) => String(value ?? '').trim().slice(0, max)

const asDate = (value) => {
  const text = asString(value, 32)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

const asTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((tag) => asString(tag, 32)).filter(Boolean).slice(0, 12)
  }
  return asString(value, 400)
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)
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

const today = () => new Date().toISOString().slice(0, 10)

const sanitizeArticle = (body) => {
  const markdown = String(body?.markdown ?? '').slice(0, 2 * 1024 * 1024)
  const title = asString(body?.title, 200) || '未命名文章'
  if (!markdown.trim()) return null
  return {
    title,
    date: asDate(body?.date) || today(),
    tags: asTags(body?.tags),
    markdown,
    downloads: asDownloads(body?.downloads),
  }
}

const sanitizeLog = (body) => {
  const markdown = String(body?.markdown ?? '').slice(0, 2 * 1024 * 1024)
  if (!markdown.trim()) return null
  return {
    title: asString(body?.title, 200) || '未命名日志',
    date: asDate(body?.date) || today(),
    markdown,
  }
}

const sanitizePhoto = (body) => {
  const url = asString(body?.url, 500)
  if (!url) return null
  return {
    url,
    name: asString(body?.name, 200) || url.split('/').pop() || 'photo',
    date: asDate(body?.date) || '',
  }
}

const sanitizeVideo = (body) => {
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

const CONTENT_RULES = {
  articles: { permission: 'articles', sanitize: sanitizeArticle },
  logs: { permission: 'logs', sanitize: sanitizeLog },
  photos: { permission: 'photos', sanitize: sanitizePhoto },
  videos: { permission: 'videos', sanitize: sanitizeVideo },
}

// ---------- 登录 / 会话 ----------
app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip ?? 'unknown'
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: 'too_many_attempts' })
  }
  const username = asString(req.body?.username, 64)
  const password = String(req.body?.password ?? '')
  const user = await store.users.findBy('username', username)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'invalid_credentials' })
  }
  const token = createSession(user.id)
  res.json({ token, user: publicUser(user) })
})

app.post('/api/admin/logout', authenticate, (req, res) => {
  sessions.delete(req.token)
  res.json({ ok: true })
})

app.get('/api/admin/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// ---------- 成员管理 ----------
const USERNAME_RE = /^[\w.-]{3,32}$/

function sanitizePermissions(value, actor) {
  const list = Array.isArray(value)
    ? value.filter((item) => PERMISSIONS.includes(item))
    : []
  if (actor.role !== 'owner') {
    // 非 owner 不能授予 members 权限（避免权限扩散）
    return list.filter((item) => item !== 'members')
  }
  return list
}

app.get('/api/admin/users', authenticate, requireOwnerOrMembers, async (req, res) => {
  const users = (await store.users.list()).map(publicUser)
  res.json({ users })
})

app.post('/api/admin/users', authenticate, requireOwnerOrMembers, async (req, res) => {
  const username = asString(req.body?.username, 64)
  const password = String(req.body?.password ?? '')
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'invalid_username' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password_too_short' })
  }
  if (await store.users.findBy('username', username)) {
    return res.status(409).json({ error: 'username_taken' })
  }
  const user = await store.users.create({
    username,
    passwordHash: hashPassword(password),
    role: 'admin',
    permissions: sanitizePermissions(req.body?.permissions, req.user),
  })
  res.status(201).json({ user: publicUser(user) })
})

app.put('/api/admin/users/:id', authenticate, requireOwnerOrMembers, async (req, res) => {
  const id = Number(req.params.id)
  const target = await store.users.get(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (target.role === 'owner' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'forbidden' })
  }
  const patch = {}
  if (req.body?.password) {
    const password = String(req.body.password)
    if (password.length < 6) {
      return res.status(400).json({ error: 'password_too_short' })
    }
    patch.passwordHash = hashPassword(password)
  }
  if (req.body?.permissions !== undefined) {
    patch.permissions = sanitizePermissions(req.body.permissions, req.user)
  }
  const updated = await store.users.update(id, patch)
  res.json({ user: publicUser(updated) })
})

app.delete('/api/admin/users/:id', authenticate, requireOwnerOrMembers, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'cannot_delete_self' })
  const target = await store.users.get(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (target.role === 'owner') {
    return res.status(403).json({ error: 'cannot_delete_owner' })
  }
  await store.users.remove(id)
  res.json({ ok: true })
})

// ---------- 内容 CRUD（管理端） ----------
for (const [name, rule] of Object.entries(CONTENT_RULES)) {
  app.get(
    `/api/admin/${name}`,
    authenticate,
    requirePermission(rule.permission),
    async (req, res) => {
      res.json({ items: await store[name].list() })
    },
  )

  app.post(
    `/api/admin/${name}`,
    authenticate,
    requirePermission(rule.permission),
    async (req, res) => {
      const data = rule.sanitize(req.body)
      if (!data) return res.status(400).json({ error: 'invalid_input' })
      res.status(201).json(await store[name].create(data))
    },
  )

  app.put(
    `/api/admin/${name}/:id`,
    authenticate,
    requirePermission(rule.permission),
    async (req, res) => {
      const data = rule.sanitize(req.body)
      if (!data) return res.status(400).json({ error: 'invalid_input' })
      const updated = await store[name].update(Number(req.params.id), data)
      if (!updated) return res.status(404).json({ error: 'not_found' })
      res.json(updated)
    },
  )

  app.delete(
    `/api/admin/${name}/:id`,
    authenticate,
    requirePermission(rule.permission),
    async (req, res) => {
      const ok = await store[name].remove(Number(req.params.id))
      if (!ok) return res.status(404).json({ error: 'not_found' })
      res.json({ ok: true })
    },
  )
}

// ---------- 文件上传 ----------
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
    /* 没有 EXIF 或格式不支持 */
  }
  const matched = /(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})/.exec(originalName)
  return matched ? `${matched[1]}-${matched[2]}-${matched[3]}` : null
}

app.post(
  '/api/admin/upload',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'no_file' })
    const kind = UPLOAD_KINDS.has(String(req.query.kind))
      ? String(req.query.kind)
      : 'file'
    const url = `/uploads/${kind}/${req.file.filename}`
    const date =
      kind === 'photo' ? await readPhotoDate(req.file.path, req.file.originalname) : null
    res.json({
      url,
      name: req.file.originalname,
      size: req.file.size,
      date,
    })
  },
)

// ---------- 公开内容接口（前台读取） ----------
const byDateDesc = (a, b) =>
  String(b.date ?? '').localeCompare(String(a.date ?? '')) || b.id - a.id

app.get('/api/content/articles', async (_req, res) => {
  const items = (await store.articles.list()).sort(byDateDesc)
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items })
})

app.get('/api/content/logs', async (_req, res) => {
  const items = (await store.logs.list()).sort(byDateDesc)
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items })
})

app.get('/api/content/photos', async (_req, res) => {
  const items = (await store.photos.list()).sort(byDateDesc)
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items })
})

app.get('/api/content/videos', async (_req, res) => {
  const items = await store.videos.list()
  res.set('Cache-Control', 'public, max-age=30')
  res.json({ items })
})

// ---------- 留言板 ----------
app.get('/api/messages', async (_req, res) => {
  const items = (await store.messages.list()).sort((a, b) => b.id - a.id).slice(0, 60)
  res.json({ messages: items })
})

app.post('/api/messages', async (req, res) => {
  const name = asString(req.body?.name, 24)
  const content = asString(req.body?.content, 120)
  if (!name || !content) return res.status(400).json({ error: 'invalid_input' })
  const message = await store.messages.create({ name, content })
  res.status(201).json(message)
})

// ---------- 健康检查 ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: mode, time: new Date().toISOString() })
})

// ---------- 静态资源 ----------
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    fallthrough: true,
    maxAge: '7d',
    setHeaders(response, filePath) {
      response.setHeader(
        'Cache-Control',
        filePath.includes(`${path.sep}photos${path.sep}`)
          ? 'public, max-age=604800'
          : 'public, max-age=2592000',
      )
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

// SPA 回退（仅 GET，且排除接口/上传路径）
app.use((req, res, next) => {
  if (req.method !== 'GET') return next()
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
  if (!fs.existsSync(DIST_DIR)) return next()
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

// ---------- 错误处理 ----------
app.use((err, _req, res, _next) => {
  console.error('[server]', err)
  res.status(500).json({ error: 'server_error' })
})

app.listen(PORT, () => {
  console.log(`[server] RHINE//HOME backend on http://localhost:${PORT}`)
  console.log(`[server] storage: ${mode}`)
})
