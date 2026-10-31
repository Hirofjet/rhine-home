/* ============================================================
   前端统一 API 客户端
   - 账号 / 会话 / 邮箱验证码
   - 前台内容（档案、日志、留言板）
   - 论坛（板块、帖子、回复）
   - 管理后台（内容、成员、权限、论坛板块、审核、上传）
   ============================================================ */

export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
const TOKEN_KEY = 'rhine:token'

// ---------- 类型 ----------
export type Role = 'super' | 'admin' | 'moderator' | 'user'

export interface ApiUser {
  id: number
  username: string
  email: string
  emailVerified: boolean
  isSuper: boolean
  status: 'active' | 'disabled'
  permissions: string[]
  role: Role
  createdAt?: string
}

export interface Download {
  label: string
  file: string
  size?: string
  note?: string
}

export interface ContentArticle {
  id: number
  title: string
  date?: string | null
  tags?: string[]
  markdown: string
  downloads?: Download[]
}

export interface ContentLog {
  id: number
  title: string
  date?: string | null
  markdown: string
}

export interface ContentPhoto {
  id: number
  url: string
  name: string
  date?: string | null
}

export interface ContentVideo {
  id: number
  title: string
  description?: string
  tags?: string[]
  src: string
  poster?: string
}

export interface Attachment {
  type: 'image' | 'video' | 'file'
  url: string
  name: string
  size: number
}

export interface Board {
  id: number
  slug: string
  name: string
  description: string
  sort: number
  postCount: number
  lastPostAt: string | null
  pendingCount?: number
  canModerate?: boolean
}

export interface PostSummary {
  id: number
  title: string
  author: string
  authorId: number
  createdAt: string
  updatedAt?: string
  replyCount: number
}

export interface ForumPost {
  id: number
  title: string
  content: string
  attachments: Attachment[]
  author: string
  authorId: number
  board: { id: number; slug: string; name: string }
  createdAt: string
}

export interface ForumReply {
  id: number
  content: string
  attachments: Attachment[]
  author: string
  authorId: number
  createdAt: string
}

export interface UploadResult {
  url: string
  name: string
  size: number
  date: string | null
}

export interface PendingPost {
  id: number
  title: string
  content: string
  attachments: Attachment[]
  boardId: number
  boardName: string
  author: string
  createdAt: string
}

export interface PendingReply {
  id: number
  content: string
  attachments: Attachment[]
  postId: number
  postTitle: string
  boardName: string
  author: string
  createdAt: string
}

// ---------- 令牌 ----------
export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('rhine:session'))
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('rhine:session'))
}

// ---------- 错误信息 ----------
const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: '登录状态已失效，请重新登录',
  forbidden: '没有权限执行此操作',
  invalid_credentials: '用户名或密码错误',
  too_many_attempts: '尝试过于频繁，请稍后再试',
  account_taken: '用户名或邮箱已被使用',
  username_taken: '用户名已被使用',
  email_taken: '邮箱已被使用',
  invalid_email: '邮箱格式不正确',
  invalid_username: '用户名需为 3-32 位字母、数字、下划线或短横线',
  password_too_short: '密码至少 6 位',
  password_mismatch: '两次输入的密码不一致',
  wrong_current_password: '原密码不正确',
  invalid_code: '验证码错误或已过期',
  too_soon: '发送太频繁，请稍后再试',
  too_many_requests: '操作过于频繁，请稍后再试',
  email_not_found: '该邮箱未注册',
  cannot_change_own_permissions: '不能修改自己的权限',
  cannot_delete_self: '不能删除自己',
  cannot_delete_super: '不能删除超级管理员',
  cannot_modify_super: '不能修改超级管理员的权限',
  use_self_password_endpoint: '修改自己的密码请前往「设置」',
  email_not_verified: '邮箱未验证，暂时无法操作',
  invalid_board: '板块不存在',
  post_not_found: '帖子不存在或尚未过审',
  not_found: '内容不存在',
  invalid_input: '输入内容不合法',
  nothing_to_update: '没有需要更新的内容',
  file_too_large: '文件过大',
  no_file: '请选择文件',
  db_unavailable: '数据库连接失败',
  server_error: '服务器异常，请稍后重试',
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return ERROR_MESSAGES[error.message] ?? error.message
  }
  return '请求失败，请稍后重试'
}

// ---------- 基础请求 ----------
interface RequestOptions {
  method?: string
  body?: unknown
  form?: FormData
  auth?: boolean
}

async function api<T>(pathname: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true } = options
  const headers = new Headers()
  if (auth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  let payload: BodyInit | undefined
  if (form) payload = form
  else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${API_BASE}${pathname}`, { method, headers, body: payload })
  if (res.status === 401) clearToken()
  if (!res.ok) {
    let code = `HTTP ${res.status}`
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) code = data.error
    } catch {
      /* ignore */
    }
    throw new Error(code)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** 把后端相对地址补全为可访问地址 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:)/i.test(url)) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

// ---------- 账号 ----------
export const authApi = {
  login(username: string, password: string) {
    return api<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    })
  },
  logout() {
    return api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
  },
  me() {
    return api<{ user: ApiUser }>('/api/auth/me')
  },
  emailCode(email: string, purpose: 'register' | 'reset') {
    return api<{ ok: boolean; devCode?: string }>('/api/auth/email-code', {
      method: 'POST',
      body: { email, purpose },
      auth: false,
    })
  },
  register(input: { username: string; email: string; code: string; password: string }) {
    return api<{ token: string; user: ApiUser }>('/api/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    })
  },
  resetPassword(input: { email: string; code: string; password: string }) {
    return api<{ ok: boolean }>('/api/auth/password/reset', {
      method: 'POST',
      body: input,
      auth: false,
    })
  },
  changePassword(input: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) {
    return api<{ ok: boolean }>('/api/admin/me/password', {
      method: 'POST',
      body: input,
    })
  },
}

// ---------- 前台内容 ----------
export const contentApi = {
  async articles(): Promise<ContentArticle[]> {
    const data = await api<{ items?: ContentArticle[] }>('/api/content/articles', {
      auth: false,
    })
    return data.items ?? []
  },
  async logs(): Promise<ContentLog[]> {
    const data = await api<{ items?: ContentLog[] }>('/api/content/logs', {
      auth: false,
    })
    return data.items ?? []
  },
  async photos(): Promise<ContentPhoto[]> {
    const data = await api<{ items?: ContentPhoto[] }>('/api/content/photos', {
      auth: false,
    })
    return data.items ?? []
  },
  async videos(): Promise<ContentVideo[]> {
    const data = await api<{ items?: ContentVideo[] }>('/api/content/videos', {
      auth: false,
    })
    return data.items ?? []
  },
}

export interface GuestMessage {
  id: number
  name: string
  content: string
  createdAt: string
}

export async function listMessages(): Promise<GuestMessage[]> {
  const data = await api<{ messages?: GuestMessage[] }>('/api/messages', {
    auth: false,
  })
  return data.messages ?? []
}

export async function createMessage(input: {
  name: string
  content: string
}): Promise<GuestMessage> {
  return api<GuestMessage>('/api/messages', {
    method: 'POST',
    body: input,
    auth: false,
  })
}

// ---------- 论坛 ----------
export const forumApi = {
  boards() {
    return api<{ boards: Board[] }>('/api/forum/boards', { auth: false })
  },
  board(slug: string, page = 1) {
    return api<{
      board: Board
      posts: PostSummary[]
      pagination: { page: number; limit: number; total: number }
    }>(`/api/forum/boards/${encodeURIComponent(slug)}?page=${page}`, {
      auth: false,
    })
  },
  post(id: number) {
    return api<{ post: ForumPost; replies: ForumReply[] }>(
      `/api/forum/posts/${id}`,
      { auth: false },
    )
  },
  createPost(input: {
    boardId: number
    title: string
    content: string
    attachments: Attachment[]
  }) {
    return api<{ id: number; status: string; message: string }>('/api/forum/posts', {
      method: 'POST',
      body: input,
    })
  },
  reply(postId: number, input: { content: string; attachments: Attachment[] }) {
    return api<{ id: number; status: string; message: string }>(
      `/api/forum/posts/${postId}/replies`,
      { method: 'POST', body: input },
    )
  },
  my() {
    return api<{
      posts: Array<{
        id: number
        title: string
        status: string
        createdAt: string
        board: { slug: string; name: string }
      }>
      replies: Array<{
        id: number
        content: string
        status: string
        createdAt: string
        post: { id: number; title: string }
      }>
    }>('/api/forum/my')
  },
}

// ---------- 上传 ----------
export async function uploadFile(
  file: File,
  kind: 'file' | 'photo' | 'video',
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  return api<UploadResult>(`/api/upload?kind=${kind}`, { method: 'POST', form })
}

// ---------- 管理后台 ----------
export const adminApi = {
  overview() {
    return api<{ counts: Record<string, number>; role: string }>('/api/admin/overview')
  },
  list(name: string) {
    return api<{ items: unknown[] }>(`/api/admin/${name}`)
  },
  create<T>(name: string, data: unknown) {
    return api<T>(`/api/admin/${name}`, { method: 'POST', body: data })
  },
  update<T>(name: string, id: number, data: unknown) {
    return api<T>(`/api/admin/${name}/${id}`, { method: 'PUT', body: data })
  },
  remove(name: string, id: number) {
    return api<{ ok: boolean }>(`/api/admin/${name}/${id}`, { method: 'DELETE' })
  },
  upload: uploadFile,
  users() {
    return api<{ users: ApiUser[] }>('/api/admin/users')
  },
  createUser(data: {
    username: string
    email: string
    password: string
    permissions?: string[]
  }) {
    return api<{ user: ApiUser }>('/api/admin/users', { method: 'POST', body: data })
  },
  updateUser(id: number, data: { email?: string; password?: string; status?: string }) {
    return api<{ user: ApiUser }>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: data,
    })
  },
  updatePermissions(id: number, permissions: string[]) {
    return api<{ user: ApiUser }>(`/api/admin/users/${id}/permissions`, {
      method: 'PUT',
      body: { permissions },
    })
  },
  removeUser(id: number) {
    return api<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' })
  },
  forumBoards() {
    return api<{ boards: Board[] }>('/api/admin/forum/boards')
  },
  createBoard(data: { name: string; slug: string; description?: string; sort?: number }) {
    return api<{ id: number }>('/api/admin/forum/boards', {
      method: 'POST',
      body: data,
    })
  },
  updateBoard(
    id: number,
    data: { name?: string; slug?: string; description?: string; sort?: number },
  ) {
    return api<{ ok: boolean }>(`/api/admin/forum/boards/${id}`, {
      method: 'PUT',
      body: data,
    })
  },
  removeBoard(id: number) {
    return api<{ ok: boolean }>(`/api/admin/forum/boards/${id}`, {
      method: 'DELETE',
    })
  },
  pending(page = 1) {
    return api<{ posts: PendingPost[]; replies: PendingReply[] }>(
      `/api/admin/forum/pending?page=${page}`,
    )
  },
  review(input: { type: 'post' | 'reply'; id: number; approve: boolean; note?: string }) {
    return api<{ ok: boolean }>('/api/admin/forum/review', {
      method: 'POST',
      body: input,
    })
  },
}

// ---------- 权限辅助 ----------
export function hasPerm(user: ApiUser | null, permission: string): boolean {
  if (!user) return false
  if (user.isSuper) return true
  if (user.permissions.includes(permission)) return true
  if (permission.startsWith('archive.')) return user.permissions.includes('archive')
  if (permission.startsWith('forum.') && permission !== 'forum') {
    return user.permissions.includes('forum')
  }
  return false
}

export function isStaffUser(user: ApiUser | null): boolean {
  if (!user) return false
  if (user.isSuper) return true
  return user.permissions.some(
    (p) =>
      p === 'archive' ||
      p.startsWith('archive.') ||
      p === 'logs' ||
      p === 'forum' ||
      p.startsWith('forum.') ||
      p === 'members.manage' ||
      p === 'members.grant',
  )
}

export const ROLE_LABELS: Record<Role, string> = {
  super: '超级用户',
  admin: '管理员',
  moderator: '论坛管理员',
  user: '普通用户',
}
