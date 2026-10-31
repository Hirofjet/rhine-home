/* ============================================================
   账号与会话
   ------------------------------------------------------------
   · 密码：scrypt（node:crypto），格式 scrypt$salt$hash
   · 会话：token 存 MySQL（服务重启不掉线）
   · 权限：字符串集合 + 父子继承
       archive           档案（含全部子权限）
       archive.articles  档案-文章
       archive.photos    档案-照片
       archive.videos    档案-视频
       logs              日志
       forum             论坛（全部板块）
       forum.<boardId>   论坛-指定板块
       members.manage    管理成员
       members.grant     授权权限
   ============================================================ */
import crypto from 'node:crypto'
import { config } from './config.mjs'
import { query, execute } from './db.mjs'

export const PERMISSION_KEYS = [
  'archive',
  'archive.articles',
  'archive.photos',
  'archive.videos',
  'logs',
  'forum',
  'members.manage',
  'members.grant',
]

export const isForumPermission = (permission) =>
  permission === 'forum' || /^forum\.\d+$/.test(permission)

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  try {
    const test = crypto.scryptSync(String(password), salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return expected.length === test.length && crypto.timingSafeEqual(expected, test)
  } catch {
    return false
  }
}

/** 规整从数据库读出的用户（permissions JSON 可能为字符串） */
export function normalizeUser(row) {
  if (!row) return null
  let permissions = []
  try {
    permissions = Array.isArray(row.permissions)
      ? row.permissions
      : JSON.parse(row.permissions ?? '[]')
  } catch {
    permissions = []
  }
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    emailVerified: Boolean(row.email_verified),
    isSuper: Boolean(row.is_super),
    status: row.status,
    permissions: permissions.filter((p) => typeof p === 'string'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 对外返回的用户信息（不含密码哈希） */
export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    isSuper: user.isSuper,
    status: user.status,
    permissions: user.permissions,
    role: roleLabel(user),
    createdAt: user.createdAt,
  }
}

/** 派生角色标签 */
export function roleLabel(user) {
  if (user.isSuper) return 'super'
  if (
    user.permissions.includes('members.manage') ||
    user.permissions.includes('members.grant')
  ) {
    return 'admin'
  }
  if (user.permissions.some(isForumPermission)) return 'moderator'
  return 'user'
}

/** 是否拥有某权限（父权限覆盖子权限） */
export function hasPermission(user, permission) {
  if (!user) return false
  if (user.isSuper) return true
  if (user.permissions.includes(permission)) return true
  if (permission.startsWith('archive.')) {
    return user.permissions.includes('archive')
  }
  if (isForumPermission(permission) && permission !== 'forum') {
    return user.permissions.includes('forum')
  }
  return false
}

/** 是否拥有任意管理类权限（可进入后台） */
export function isStaff(user) {
  if (!user) return false
  if (user.isSuper) return true
  return (
    user.permissions.includes('members.manage') ||
    user.permissions.includes('members.grant') ||
    user.permissions.some(
      (p) => p === 'archive' || p === 'logs' || isForumPermission(p),
    )
  )
}

/** 过滤非法权限值；非超管不能授予管理成员 / 授权权限 */
export function sanitizePermissions(value, actor) {
  if (!Array.isArray(value)) return []
  const allowed = new Set(PERMISSION_KEYS)
  const list = value
    .filter((item) => typeof item === 'string')
    .filter((item) => allowed.has(item) || /^forum\.\d+$/.test(item))
  const unique = [...new Set(list)]
  if (!actor?.isSuper) {
    return unique.filter(
      (p) => p !== 'members.manage' && p !== 'members.grant',
    )
  }
  return unique
}

// ---------- 会话 ----------
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000)
  await execute(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expires],
  )
  return token
}

export async function destroySession(token) {
  await execute('DELETE FROM sessions WHERE token = ?', [token])
}

export async function userBySession(token) {
  if (!token) return null
  const rows = await query(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [token],
  )
  return normalizeUser(rows[0])
}

export async function pruneSessions() {
  await execute('DELETE FROM sessions WHERE expires_at <= NOW()')
}

export function tokenFromRequest(req) {
  const header = req.headers.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}
