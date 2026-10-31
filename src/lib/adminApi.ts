/* ============================================================
   管理后台接口客户端
   ============================================================ */

export interface AdminUser {
  id: number
  username: string
  role: 'owner' | 'admin'
  permissions: string[]
}

export type PermissionKey = 'articles' | 'logs' | 'photos' | 'videos' | 'members'

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  articles: '文章',
  logs: '日志',
  photos: '照片',
  videos: '视频',
  members: '成员',
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
const TOKEN_KEY = 'rhine:admin-token'

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
    /* 忽略存储异常 */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 忽略存储异常 */
  }
}

async function request<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API_BASE}${pathname}`, { ...init, headers })
  if (res.status === 401) clearToken()
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      /* 非 JSON 错误 */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export interface UploadResult {
  url: string
  name: string
  size: number
  date: string | null
}

export const adminApi = {
  login(username: string, password: string) {
    return request<{ token: string; user: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  me() {
    return request<{ user: AdminUser }>('/api/admin/me')
  },
  logout() {
    return request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' })
  },
  list(name: string) {
    return request<{ items: unknown[] }>(`/api/admin/${name}`)
  },
  create<T>(name: string, data: unknown) {
    return request<T>(`/api/admin/${name}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  update<T>(name: string, id: number, data: unknown) {
    return request<T>(`/api/admin/${name}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  remove(name: string, id: number) {
    return request<{ ok: boolean }>(`/api/admin/${name}/${id}`, {
      method: 'DELETE',
    })
  },
  async upload(file: File, kind: 'file' | 'photo' | 'video'): Promise<UploadResult> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/api/admin/upload?kind=${kind}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as UploadResult
  },
  users() {
    return request<{ users: AdminUser[] }>('/api/admin/users')
  },
  createUser(data: { username: string; password: string; permissions: string[] }) {
    return request<{ user: AdminUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  updateUser(id: number, data: { password?: string; permissions?: string[] }) {
    return request<{ user: AdminUser }>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  removeUser(id: number) {
    return request<{ ok: boolean }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    })
  },
}

/** 文件大小格式化 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
