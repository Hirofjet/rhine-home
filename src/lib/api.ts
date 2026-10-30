/* ============================================================
   留言板 API 接口层（预留 MySQL 后端）
   ------------------------------------------------------------
   · 前端默认请求同源的 /api/messages；如需跨域，在 .env 里配置
     VITE_API_BASE=http://localhost:3001
   · 后端未就绪时自动回退到浏览器 localStorage，页面照常可用
   · 留言 id 为自增序号（第一条 = 1，第二条 = 2 …）：
     - 后端：MySQL 的 AUTO_INCREMENT 直接提供序号
     - 本地回退：取现有最大 id + 1，保证同内容/同名字的留言不会互相覆盖
   · MySQL 表结构与后端示例见 server/README.md 与 server/index.mjs
   ============================================================ */

export interface GuestMessage {
  /** 自增序号（唯一 id） */
  id: number
  name: string
  content: string
  createdAt: string
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
const LOCAL_KEY = 'rhine:guestbook'
const MAX_LOCAL = 200

/** 读取本地留言（兼容旧数据，统一把 id 规整为数字） */
function readLocal(): GuestMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const messages: GuestMessage[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const v = item as Record<string, unknown>
      const id = Number(v.id)
      if (!Number.isFinite(id)) continue
      if (typeof v.name !== 'string' || typeof v.content !== 'string') continue
      messages.push({
        id,
        name: v.name,
        content: v.content,
        createdAt:
          typeof v.createdAt === 'string'
            ? v.createdAt
            : new Date().toISOString(),
      })
    }
    return messages
  } catch {
    return []
  }
}

/** 下一条留言的序号（现有最大 id + 1） */
function nextLocalId(list: GuestMessage[]): number {
  return list.reduce((max, m) => (m.id > max ? m.id : max), 0) + 1
}

function writeLocal(messages: GuestMessage[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(messages.slice(0, MAX_LOCAL)))
  } catch {
    /* 忽略隐私模式等存储异常 */
  }
}

/** 拉取留言列表：优先后端，失败回退本地 */
export async function listMessages(): Promise<GuestMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/api/messages`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as
      | { messages?: GuestMessage[] }
      | GuestMessage[]
    const list = Array.isArray(data) ? data : (data.messages ?? [])
    return list.filter(isGuestMessage)
  } catch {
    return readLocal()
  }
}

/** 提交留言：优先后端，失败写入本地（本地按最大 id + 1 分配序号） */
export async function createMessage(input: {
  name: string
  content: string
}): Promise<GuestMessage> {
  try {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const msg = (await res.json()) as GuestMessage
    if (isGuestMessage(msg)) return msg
    throw new Error('invalid response')
  } catch {
    const existing = readLocal()
    const msg: GuestMessage = {
      id: nextLocalId(existing),
      name: input.name,
      content: input.content,
      createdAt: new Date().toISOString(),
    }
    writeLocal([msg, ...existing])
    return msg
  }
}

function isGuestMessage(value: unknown): value is GuestMessage {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'number' &&
    Number.isFinite(v.id) &&
    typeof v.name === 'string' &&
    typeof v.content === 'string' &&
    typeof v.createdAt === 'string'
  )
}
