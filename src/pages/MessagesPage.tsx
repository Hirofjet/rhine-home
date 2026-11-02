/* oxlint-disable react/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  MessageSquare,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react'
import {
  resolveMediaUrl,
  userApi,
  type ChatMessage,
  type Friend,
  type NotificationItem,
} from '../lib/api'
import { cx } from '../lib/cx'
import { formatDateTime } from '../lib/format'
import { useSession } from '../components/auth/useSession'

const IMPORTANT = new Set(['review', 'permission', 'ban', 'access'])

function weightOf(item: NotificationItem) {
  if (IMPORTANT.has(item.type)) return 1
  if (item.type === 'friend' || item.type === 'dm') return 2
  return 3
}

function notificationLink(item: NotificationItem) {
  if (!item.link) return null
  return item.link
    .replace('/profile?chat=', '/messages?with=')
    .replace('/profile?tab=messages', '/messages')
}

function Avatar({ src, name, size = 'h-10 w-10' }: { src?: string; name: string; size?: string }) {
  return src ? (
    <img
      src={resolveMediaUrl(src)}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`${size} shrink-0 rounded-full border border-rhine-gold/40 object-cover`}
    />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full border border-rhine-line bg-rhine-abyss font-mono text-xs text-rhine-gold`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** 消息面板：一级系统通知 → 二级好友消息 → 三级普通动态 */
export function MessagesPage() {
  const { user } = useSession()
  const [search, setSearch] = useSearchParams()
  const selectedId = Number(search.get('with')) || null
  const highlightId = Number(search.get('message')) || null
  const [friends, setFriends] = useState<Friend[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const selected = friends.find((friend) => friend.id === selectedId) ?? null

  const load = () => {
    void userApi.friends().then((data) => setFriends(data.friends))
    void userApi.notifications().then((data) => setNotifications(data.notifications))
  }

  useEffect(() => {
    if (!user) return undefined
    load()
    const timer = window.setInterval(load, 20_000)
    return () => window.clearInterval(timer)
  }, [user])

  useEffect(() => {
    if (!selectedId || !user) {
      setChat([])
      return undefined
    }
    let alive = true
    setLoadingChat(true)
    userApi
      .messagesWith(selectedId)
      .then((data) => {
        if (!alive) return
        setChat(data.messages)
        setError('')
        void userApi.friends().then((next) => setFriends(next.friends))
      })
      .catch(() => {
        if (alive) {
          setChat([])
          setError('你们还不是好友，互相关注后即可私信。')
        }
      })
      .finally(() => {
        if (alive) setLoadingChat(false)
      })
    return () => {
      alive = false
    }
  }, [selectedId, user])

  useEffect(() => {
    const target = highlightId ? document.getElementById(`msg-${highlightId}`) : bottomRef.current
    if (!target) return
    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [chat, highlightId, loadingChat])

  const selectFriend = (id: number) => {
    setSearch({ with: String(id) })
    setText('')
  }

  const send = async () => {
    if (!selected || !text.trim() || sending) return
    setSending(true)
    try {
      const result = await userApi.sendDm(selected.id, text.trim())
      setChat((current) => [
        ...current,
        { id: result.id, fromMe: true, content: text.trim(), createdAt: new Date().toISOString() },
      ])
      setText('')
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      load()
    } catch {
      setError('发送失败，请确认你们已经是好友。')
    } finally {
      setSending(false)
    }
  }

  const openNotification = (item: NotificationItem) => {
    if (!item.read) {
      void userApi.readNotifications(item.id).then(load)
    }
    const link = notificationLink(item)
    if (link) window.location.assign(link)
  }

  const groups = useMemo(() => {
    const visible = notifications.filter((item) => item.type !== 'dm')
    return {
      important: visible.filter((item) => weightOf(item) === 1 && !item.read),
      friendNotes: visible.filter((item) => weightOf(item) === 2 && !item.read),
      normal: visible.filter((item) => weightOf(item) === 3 || item.read),
    }
  }, [notifications])

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 pt-24">
        <MessageSquare className="h-8 w-8 text-rhine-gold" />
        <p className="mt-4 font-display text-xl text-rhine-ink">消息面板</p>
        <p className="mt-2 font-mono text-[11px] tracking-wider text-rhine-dim">
          登录后查看好友消息与系统通知
        </p>
        <Link
          to="/profile"
          className="mt-5 border border-rhine-gold/50 px-5 py-2 font-mono text-[11px] text-rhine-gold"
        >
          前往登录
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-28 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.35em] text-rhine-faint">
            COMMUNICATION // MESSAGE BOARD
          </p>
          <h1 className="mt-2 font-display text-2xl tracking-[0.1em] text-rhine-ink sm:text-3xl">
            消息面板
          </h1>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-rhine-dim">
            消息权重排序
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 border border-rhine-line px-3 py-2 font-mono text-[10px] text-rhine-dim hover:border-rhine-gold/60 hover:text-rhine-gold"
        >
          <ArrowLeft className="h-3 w-3" /> 返回主页
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <section className="border border-rhine-line/70 bg-rhine-panel/35">
            <div className="flex items-center justify-between border-b border-rhine-line/60 px-3 py-2">
              <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-red">
                <ShieldAlert className="h-3 w-3" /> 一级重要
              </p>
              <span className="font-mono text-[8px] text-rhine-faint">WEIGHT 01</span>
            </div>
            {groups.important.length === 0 ? (
              <p className="px-3 py-3 font-mono text-[9px] text-rhine-faint">暂无重要的系统通知</p>
            ) : (
              groups.important.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className="block w-full border-l-2 border-l-rhine-red bg-rhine-red/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-rhine-red/[0.08]"
                >
                  <p className="text-xs text-rhine-gold">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-rhine-dim">
                    {item.content}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-rhine-faint">
                    {formatDateTime(item.createdAt)}
                  </p>
                </button>
              ))
            )}
          </section>

          <section className="border border-rhine-line/70 bg-rhine-panel/35">
            <div className="flex items-center justify-between border-b border-rhine-line/60 px-3 py-2">
              <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-cyan">
                <Users className="h-3 w-3" /> 好友消息
              </p>
              <span className="font-mono text-[8px] text-rhine-faint">{friends.length} FRIENDS</span>
            </div>
            {friends.length === 0 ? (
              <p className="px-3 py-4 font-mono text-[9px] leading-relaxed text-rhine-faint">
                还没有好友。互相关注后即可成为好友并开启私信。
              </p>
            ) : (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => selectFriend(friend.id)}
                  className={cx(
                    'flex w-full items-center gap-2.5 border-b border-rhine-line/30 px-3 py-2.5 text-left transition-colors last:border-0',
                    selectedId === friend.id
                      ? 'bg-rhine-gold/10'
                      : friend.unread > 0
                        ? 'border-l-2 border-l-rhine-cyan bg-rhine-cyan/[0.04] hover:bg-rhine-cyan/[0.08]'
                        : 'hover:bg-rhine-abyss/50',
                  )}
                >
                  <Avatar src={friend.avatarUrl} name={friend.username} size="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-xs text-rhine-ink">{friend.username}</span>
                      {friend.unread > 0 && (
                        <span className="rounded-full bg-rhine-red px-1.5 font-mono text-[8px] text-white">
                          {friend.unread}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[10px] text-rhine-faint">
                      {friend.last
                        ? `${friend.last.fromMe ? '我：' : ''}${friend.last.content}`
                        : '开始聊天'}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[8px] text-rhine-faint">
                    {friend.last ? formatDateTime(friend.last.createdAt).slice(5, 16) : ''}
                  </span>
                </button>
              ))
            )}
          </section>

          <section className="border border-rhine-line/70 bg-rhine-panel/35">
            <div className="flex items-center justify-between border-b border-rhine-line/60 px-3 py-2">
              <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                <Bell className="h-3 w-3" /> 普通通知
              </p>
              <button
                type="button"
                onClick={() => void userApi.readNotifications().then(load)}
                className="flex items-center gap-1 font-mono text-[8px] text-rhine-faint hover:text-rhine-gold"
              >
                <CheckCheck className="h-3 w-3" /> 全部已读
              </button>
            </div>
            {groups.normal.length === 0 ? (
              <p className="px-3 py-3 font-mono text-[9px] text-rhine-faint">暂无其他通知</p>
            ) : (
              groups.normal.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className="block w-full border-b border-rhine-line/30 px-3 py-2 text-left last:border-0 hover:bg-rhine-abyss/50"
                >
                  <p className="truncate text-[11px] text-rhine-dim">{item.title}</p>
                  <p className="mt-0.5 line-clamp-1 font-mono text-[8px] text-rhine-faint">
                    {item.content}
                  </p>
                </button>
              ))
            )}
          </section>
        </aside>

        <section className="flex min-h-[520px] flex-col border border-rhine-line/70 bg-rhine-panel/30">
          {selected ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rhine-line/60 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar src={selected.avatarUrl} name={selected.username} />
                  <div>
                    <p className="text-sm text-rhine-ink">{selected.username}</p>
                    <p className="font-mono text-[9px] tracking-wider text-rhine-cyan">
                      好友 · 独立会话
                    </p>
                  </div>
                </div>
                <Link
                  to={`/u/${selected.id}`}
                  className="font-mono text-[9px] text-rhine-faint hover:text-rhine-gold"
                >
                  查看主页 →
                </Link>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {loadingChat && (
                  <p className="animate-pulse-soft font-mono text-[10px] text-rhine-faint">
                    载入会话…
                  </p>
                )}
                {!loadingChat && chat.length === 0 && (
                  <p className="font-mono text-[10px] text-rhine-faint">
                    还没有消息，发出第一条吧。
                  </p>
                )}
                {chat.map((message) => (
                  <div
                    key={message.id}
                    id={`msg-${message.id}`}
                    className={cx(
                      'max-w-[78%] border px-3 py-2 text-xs leading-relaxed',
                      message.fromMe
                        ? 'ml-auto border-rhine-gold/40 bg-rhine-gold/10 text-rhine-gold'
                        : 'border-rhine-line bg-rhine-abyss/50 text-rhine-dim',
                      highlightId === message.id && 'ring-1 ring-rhine-cyan/70',
                    )}
                  >
                    {message.content}
                    <span className="mt-1 block text-right font-mono text-[8px] opacity-60">
                      {formatDateTime(message.createdAt)}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-rhine-line/60 p-3">
                {error && (
                  <p className="mb-2 font-mono text-[9px] text-rhine-red">{error}</p>
                )}
                <div className="flex gap-2">
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void send()
                    }}
                    maxLength={2000}
                    placeholder="输入消息…"
                    className="min-w-0 flex-1 border border-rhine-line bg-rhine-abyss/60 px-3 py-2 text-xs text-rhine-ink placeholder:text-rhine-faint focus:border-rhine-gold/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={sending || !text.trim()}
                    className="flex items-center gap-1.5 border border-rhine-gold/50 bg-rhine-gold/10 px-3 font-mono text-[10px] text-rhine-gold disabled:opacity-40"
                  >
                    <Send className="h-3 w-3" /> 发送
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageSquare className="h-7 w-7 text-rhine-faint" />
              <p className="mt-3 font-display text-lg text-rhine-ink">选择一个好友</p>
              <p className="mt-1 font-mono text-[9px] leading-relaxed text-rhine-dim">
                左侧按消息权重排列：一级系统通知 → 二级好友消息 → 普通通知
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
