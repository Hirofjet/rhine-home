/* ============================================================
   前台内容接口（公开只读）
   ------------------------------------------------------------
   后端未启动时各组件会自动回退到本地静态内容，站点照常可用。
   ============================================================ */

export interface ContentDownload {
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
  downloads?: ContentDownload[]
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

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

async function getJson<T>(pathname: string): Promise<T> {
  const res = await fetch(`${API_BASE}${pathname}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export const contentApi = {
  async articles(): Promise<ContentArticle[]> {
    const data = await getJson<{ items?: ContentArticle[] }>(
      '/api/content/articles',
    )
    return data.items ?? []
  },
  async logs(): Promise<ContentLog[]> {
    const data = await getJson<{ items?: ContentLog[] }>('/api/content/logs')
    return data.items ?? []
  },
  async photos(): Promise<ContentPhoto[]> {
    const data = await getJson<{ items?: ContentPhoto[] }>('/api/content/photos')
    return data.items ?? []
  },
  async videos(): Promise<ContentVideo[]> {
    const data = await getJson<{ items?: ContentVideo[] }>('/api/content/videos')
    return data.items ?? []
  },
}

/** 把后端返回的相对路径（/uploads/...）补全为可访问地址 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:)/i.test(url)) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}
