import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { DanmakuWall } from '../components/guestbook/DanmakuWall'
import { SectionTitle } from '../components/ui'
import type { GuestMessage } from '../lib/api'
import { createMessage, deleteMessage, listMessages } from '../lib/api'

/**
 * 留言板：留言以弹幕形式滚动在整个页面上。
 * 数据通过 src/lib/api.ts 访问后端（MySQL），未配置后端时回退到本地存储。
 */
export function GuestbookPage() {
  const [messages, setMessages] = useState<GuestMessage[]>([])
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    void listMessages().then((list) => {
      if (alive) setMessages(list.slice(0, 60))
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 2600)
    return () => clearTimeout(timer)
  }, [notice])

  const submit = async () => {
    const n = name.trim().slice(0, 24)
    const c = content.trim().slice(0, 120)
    if (!n || !c || sending) return
    setSending(true)
    try {
      const msg = await createMessage({ name: n, content: c })
      setMessages((prev) => [{ ...msg, mine: true }, ...prev].slice(0, 60))
      setContent('')
      setNotice('讯号已投递 · SIGNAL SENT')
    } finally {
      setSending(false)
    }
  }

  const remove = async (message: GuestMessage) => {
    if (deleting) return
    setDeleting(message.id)
    try {
      await deleteMessage(message.id)
      setMessages((prev) => prev.filter((item) => item.id !== message.id))
      setNotice('留言已删除')
    } catch {
      setNotice('删除失败，请刷新后重试')
    } finally {
      setDeleting(null)
    }
  }

  const mine = messages.filter((message) => message.mine)

  return (
    <main className="relative min-h-screen overflow-hidden pt-28">
      <DanmakuWall messages={messages} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle index="COM" en="GUESTBOOK" zh="留言板" />
        <p className="mt-3 font-mono text-[11px] tracking-wider text-rhine-faint">
          LEAVE A MESSAGE // 留下你的名字和一句话，它会飘过这片频道
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl border border-rhine-line bg-rhine-panel/90 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-rhine-line/70 px-4 py-2">
            <p className="font-mono text-[10px] tracking-[0.3em] text-rhine-gold">
              SIGNAL INPUT
            </p>
            <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
              {String(messages.length).padStart(2, '0')} MESSAGES
            </span>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="你的名字 / NAME"
              className="w-full border border-rhine-line bg-rhine-abyss/60 px-3 py-2 font-mono text-xs text-rhine-ink placeholder:text-rhine-faint focus:border-rhine-gold/60 focus:outline-none sm:w-40"
            />
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
              placeholder="写一句留言… / MESSAGE"
              className="flex-1 border border-rhine-line bg-rhine-abyss/60 px-3 py-2 font-mono text-xs text-rhine-ink placeholder:text-rhine-faint focus:border-rhine-gold/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={sending || !name.trim() || !content.trim()}
              className="flex items-center justify-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? 'SENDING' : 'SEND'}
            </button>
          </div>
          {mine.length > 0 && (
            <ul className="border-b border-rhine-line/60 px-4 py-2">
              {mine.map((message) => (
                <li key={message.id} className="flex items-center gap-2 py-1">
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-rhine-dim">
                    {message.name}：{message.content}
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(message)}
                    disabled={deleting === message.id}
                    className="shrink-0 font-mono text-[9px] tracking-wider text-rhine-faint hover:text-rhine-red disabled:opacity-50"
                  >
                    {deleting === message.id ? '删除中…' : '删除'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 pb-3 font-mono text-[9px] tracking-wider text-rhine-faint">
            {notice || ''}
          </div>
        </div>
      </div>
    </main>
  )
}
