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
  'admin.overview',
  'home.edit',
  'archive.articles',
  'archive.photos',
  'archive.videos',
  'projects',
  'logs',
  'guestbook',
  'forum',
  'forum.maintenance',
  'forum.members',
  'forum.announcements',
  'forum.create',
  'forum.review',
  'forum.access',
  'forum.category.public.master',
  'forum.category.core.master',
  'forum.category.special.master',
  'forum.post.autoapprove',
  'review.logs',
  'reports.manage',
  'moderation.manage',
  'members.manage',
  'members.grant',
  'access_logs',
  'security.logs',
  'themes.manage',
  'security.readonly',
]

export const ROLE_KEYS = [
  'super',
  'senior',
  'forum_master',
  'core_master',
  'core_admin',
  'special_master',
  'special_admin',
  'normal_master',
  'normal_admin',
  'regulator',
  'member',
]

export const ROLE_LABELS = {
  super: '超级管理员',
  senior: '高级管理员',
  forum_master: '论坛总管理员',
  core_master: '核心论坛总管理员',
  core_admin: '核心论坛管理员',
  special_master: '特殊论坛总管理员',
  special_admin: '特殊论坛管理员',
  normal_master: '普通论坛总管理员',
  normal_admin: '普通论坛管理员',
  regulator: '监管只读',
  member: '普通成员',
}

const ROLE_CLASS = {
  core_master: 'core',
  core_admin: 'core',
  special_master: 'special',
  special_admin: 'special',
  normal_master: 'public',
  normal_admin: 'public',
}

const ROLE_BASE_PERMISSIONS = {
  senior: [
    'admin.overview',
    'projects',
    'logs',
    'guestbook',
    'forum',
    'review.logs',
    'reports.manage',
    'moderation.manage',
    'access_logs',
    'security.logs',
    'themes.manage',
  ],
  forum_master: ['admin.overview', 'forum', 'guestbook'],
  core_master: ['admin.overview', 'guestbook', 'forum.category.core.master'],
  core_admin: ['admin.overview', 'guestbook'],
  special_master: ['admin.overview', 'guestbook', 'forum.category.special.master'],
  special_admin: ['admin.overview', 'guestbook'],
  normal_master: ['admin.overview', 'guestbook', 'forum.category.public.master'],
  normal_admin: ['admin.overview', 'guestbook'],
  regulator: ['security.readonly'],
  member: [],
}

export const roleForUser = (user) =>
  ROLE_KEYS.includes(user?.identity) ? user.identity : user?.isSuper ? 'super' : 'member'

export const roleClass = (role) => ROLE_CLASS[role] ?? null

/** 根据身份生成模块权限；论坛类别身份会在授权时按板块追加 forum.<id> */
export function permissionsForRole(role) {
  if (role === 'super') return [...PERMISSION_KEYS]
  return [...(ROLE_BASE_PERMISSIONS[role] ?? [])]
}

export const isForumPermission = (permission) =>
  permission === 'forum' ||
  permission === 'forum.maintenance' ||
  permission === 'forum.members' ||
  permission === 'forum.announcements' ||
  permission === 'forum.create' ||
  permission === 'forum.review' ||
  permission === 'forum.access' ||
  permission === 'forum.category.public.master' ||
  permission === 'forum.category.core.master' ||
  permission === 'forum.category.special.master' ||
  /^forum\.\d+$/.test(permission) ||
  /^forum\.\d+\.(post|reply)\.(publish|pin|hide|delete|review)$/.test(permission)

export const hasForumAction = (user, boardId, action) => {
  if (!user) return false
  if (user.isSuper || user.permissions.includes('forum')) return true
  return (
    user.permissions.includes(`forum.${boardId}.${action}`) ||
    user.permissions.includes(`forum.${boardId}`)
  )
}

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
    nickname: row.nickname || row.username,
    email: row.email,
    emailVerified: Boolean(row.email_verified),
    isSuper: Boolean(row.is_super),
    identity: row.role_code || (row.is_super ? 'super' : 'member'),
    status: row.status,
    permissions: permissions.filter((p) => typeof p === 'string'),
    avatarUrl: row.avatar_url ?? '',
    gender: row.gender ?? '',
    birthday: row.birthday ?? '',
    bio: row.bio ?? '',
    tags: (() => {
      try {
        const value = Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags ?? '[]')
        return Array.isArray(value) ? value.filter((t) => typeof t === 'string') : []
      } catch {
        return []
      }
    })(),
    genderVisibility: row.gender_visibility ?? 'private',
    birthdayVisibility: row.birthday_visibility ?? 'private',
    bioVisibility: row.bio_visibility ?? 'public',
    tagsVisibility: row.tags_visibility ?? 'public',
    forumTitle: row.forum_title ?? '',
    forumTitleLocked: Boolean(row.forum_title_locked),
    forumPoints: Number(row.forum_points ?? 0),
    forumLevel: Number(row.forum_level ?? 0),
    mfaEnabled: Boolean(row.mfa_enabled),
    mfaSecret: row.mfa_secret ?? '',
    termsVersion: row.terms_version ?? '',
    privacyVersion: row.privacy_version ?? '',
    consentAt: row.consent_at ?? null,
    banned: Boolean(row.banned),
    bannedUntil: row.banned_until ?? null,
    bannedReason: row.banned_reason ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 封禁是否仍然生效（到期自动失效） */
export function banActive(user) {
  if (!user?.banned) return false
  if (!user.bannedUntil) return true
  const until = new Date(String(user.bannedUntil).replace(' ', 'T'))
  return Number.isNaN(until.getTime()) ? true : until.getTime() > Date.now()
}

/** 对外返回的用户信息（不含密码哈希） */
export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    isSuper: user.isSuper,
    identity: user.identity,
    identityLabel: ROLE_LABELS[user.identity] ?? ROLE_LABELS.member,
    status: user.status,
    permissions: user.permissions,
    role: roleLabel(user),
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    birthday: user.birthday,
    bio: user.bio,
    tags: user.tags,
    forumTitle: user.forumTitle,
    forumTitleLocked: user.forumTitleLocked,
    forumPoints: user.forumPoints,
    forumLevel: user.forumLevel,
    mfaEnabled: Boolean(user.mfaEnabled),
    termsVersion: user.termsVersion || '',
    privacyVersion: user.privacyVersion || '',
    consentAt: user.consentAt || null,
    genderVisibility: user.genderVisibility || 'private',
    birthdayVisibility: user.birthdayVisibility || 'private',
    bioVisibility: user.bioVisibility || 'public',
    tagsVisibility: user.tagsVisibility || 'public',
    banned: banActive(user),
    bannedUntil: user.banned ? user.bannedUntil : null,
    bannedReason: user.banned ? user.bannedReason : '',
    createdAt: user.createdAt,
  }
}

/** 派生角色标签 */
export function roleLabel(user) {
  if (user.isSuper || user.identity === 'super') return 'super'
  if (user.identity && user.identity !== 'member') return 'admin'
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
      (p) =>
        p === 'admin.overview' ||
        p === 'home.edit' ||
        p.startsWith('archive.') ||
        p === 'projects' ||
        p === 'logs' ||
        p === 'guestbook' ||
        p === 'reports.manage' ||
        p === 'moderation.manage' ||
        p === 'review.logs' ||
        p === 'security.logs' ||
        p === 'access_logs' ||
        p === 'themes.manage' ||
        p === 'security.readonly' ||
        p === 'forum' ||
        isForumPermission(p),
    )
  )
}

/** 过滤非法权限值；非超管不能授予管理成员 / 授权权限 */
export function sanitizePermissions(value, actor) {
  if (!Array.isArray(value)) return []
  const allowed = new Set(PERMISSION_KEYS)
  const list = value
    .filter((item) => typeof item === 'string')
    .filter((item) => allowed.has(item) || /^forum\.\d+(?:\.(?:post|reply)\.(?:publish|pin|hide|delete|review))?$/.test(item))
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
  const expires = new Date(Date.now() + config.sessionDays * 24 * 3600 * 1000)
  await execute(
    'INSERT INTO sessions (token, user_id, expires_at, last_seen_at) VALUES (?, ?, ?, NOW())',
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
    `SELECT u.*, s.last_seen_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [token],
  )
  if (!rows.length) return null
  const lastSeen = rows[0].last_seen_at
    ? new Date(String(rows[0].last_seen_at).replace(' ', 'T'))
    : null
  const stale = !lastSeen || Date.now() - lastSeen.getTime() > 5 * 60 * 1000
  if (stale) {
    const expires = new Date(Date.now() + config.sessionDays * 24 * 3600 * 1000)
    await execute(
      'UPDATE sessions SET last_seen_at = NOW(), expires_at = ? WHERE token = ?',
      [expires, token],
    ).catch(() => undefined)
  }
  return normalizeUser(rows[0])
}

export async function pruneSessions() {
  await execute('DELETE FROM sessions WHERE expires_at <= NOW()')
}

export function tokenFromRequest(req) {
  const header = req.headers.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}
