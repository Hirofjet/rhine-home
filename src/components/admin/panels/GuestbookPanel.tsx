import { useEffect, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { adminApi, errorMessage } from '../../../lib/api'
import { formatDateTime } from '../../../lib/format'
import {
  AdminButton,
  AdminError,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'

interface AdminMessage {
  id: number
  name: string
  content: string
  userId: number | null
  createdAt: string
}

/** 留言板管理：查看 / 搜索 / 删除留言 */
export function GuestbookPanel() {
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    try {
      const data = await adminApi.messages()
      setMessages(data.messages)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    adminApi
      .messages()
      .then((data) => {
        if (alive) setMessages(data.messages)
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const remove = async (message: AdminMessage) => {
    if (!window.confirm(`删除「${message.name}」的留言？`)) return
    try {
      await adminApi.removeMessage(message.id)
      setNotice('留言已删除')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const filtered = messages.filter((message) => {
    if (!query.trim()) return true
    const keyword = query.trim().toLowerCase()
    return (
      message.name.toLowerCase().includes(keyword) ||
      message.content.toLowerCase().includes(keyword)
    )
  })

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel
        title={`留言板管理${messages.length ? `（${messages.length}）` : ''}`}
        subtitle="GUESTBOOK"
      >
        <div className="mb-3 flex items-center gap-2 border border-rhine-line bg-rhine-abyss/50 px-2 py-1.5">
          <Search className="h-3 w-3 text-rhine-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索留言内容或名字"
            className="w-full bg-transparent font-mono text-[11px] text-rhine-ink outline-none placeholder:text-rhine-faint"
          />
        </div>

        {loading ? (
          <p className="font-mono text-[10px] text-rhine-faint">加载中…</p>
        ) : filtered.length === 0 ? (
          <p className="font-mono text-[10px] text-rhine-faint">没有留言。</p>
        ) : (
          <ul className="divide-y divide-rhine-line/60">
            {filtered.map((message) => (
              <li key={message.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-24 font-mono text-[11px] text-rhine-ink">
                  {message.name}
                </span>
                <span className="min-w-0 flex-1 text-xs text-rhine-dim">
                  {message.content}
                </span>
                <span className="font-mono text-[9px] text-rhine-faint">
                  {formatDateTime(message.createdAt)}
                </span>
                <AdminButton variant="danger" onClick={() => void remove(message)}>
                  <Trash2 className="h-3 w-3" /> 删除
                </AdminButton>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}
