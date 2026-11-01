/* oxlint-disable react/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, MessageSquare, ShieldAlert } from 'lucide-react'
import {
  userApi,
  type Conversation,
  type NotificationItem,
} from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { useSession } from '../auth/useSession'

const IMPORTANT_TYPES = new Set(['review', 'permission', 'ban', 'access'])

/** 头像旁的通知 + 私信入口（合并未读数） */
export function NotificationMenu() {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!user) return undefined
    let alive = true
    const load = () => {
      userApi
        .notifications()
        .then((data) => {
          if (alive) setNotifications(data.notifications)
        })
        .catch(() => undefined)
      userApi
        .conversations()
        .then((data) => {
          if (alive) setConversations(data.conversations)
        })
        .catch(() => undefined)
    }
    load()
    const timer = window.setInterval(load, 30_000)
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [user])

  if (!user) return null

  const unreadNotifications = notifications.filter((item) => !item.read).length
  const unreadMessages = conversations.reduce((sum, item) => sum + item.unread, 0)
  const total = unreadNotifications + unreadMessages
  const important = notifications.filter(
    (item) => !item.read && IMPORTANT_TYPES.has(item.type),
  )
  const recentNotifications = notifications
    .filter((item) => item.type !== 'dm')
    .slice(0, 4)
  const recentConversations = conversations.slice(0, 3)

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center border border-rhine-line text-rhine-dim transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold"
        aria-label="通知与消息"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rhine-red px-1 font-mono text-[9px] text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 w-auto border border-rhine-line bg-rhine-panel/95 shadow-[0_16px_40px_rgb(0_0_0/0.5)] backdrop-blur sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-rhine-line/60 px-3 py-2">
            <p className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
              消息
            </p>
            <Link
              to="/profile?tab=messages"
              onClick={() => setOpen(false)}
              className="font-mono text-[9px] text-rhine-cyan hover:text-rhine-gold"
            >
              全部
            </Link>
          </div>

          {important.length > 0 && (
            <div className="border-b border-rhine-gold/30 bg-rhine-gold/[0.06] px-3 py-2">
              <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-rhine-gold">
                <ShieldAlert className="h-3 w-3" /> 重要通知
              </p>
              {important.slice(0, 2).map((item) => (
                <Link
                  key={item.id}
                  to={item.link || '/profile?tab=messages'}
                  onClick={() => setOpen(false)}
                  className="mt-1 block truncate text-xs text-rhine-gold/90"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {recentNotifications.length === 0 && recentConversations.length === 0 && (
              <p className="px-3 py-4 font-mono text-[10px] text-rhine-faint">暂无消息</p>
            )}
            {recentNotifications.map((item) => (
              <Link
                key={`n-${item.id}`}
                to={item.link || '/profile?tab=messages'}
                onClick={() => setOpen(false)}
                className={`block border-b border-rhine-line/40 px-3 py-2 hover:bg-rhine-gold/5 ${
                  item.read ? 'opacity-60' : ''
                }`}
              >
                <p className="flex items-center gap-2 text-xs text-rhine-ink">
                  {IMPORTANT_TYPES.has(item.type) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rhine-gold" />
                  )}
                  {item.title}
                </p>
                <p className="mt-0.5 truncate font-mono text-[9px] text-rhine-faint">
                  {item.content || formatDateTime(item.createdAt)}
                </p>
              </Link>
            ))}
            {recentConversations.map((conversation) => (
              <Link
                key={`c-${conversation.user.id}`}
                to="/profile?tab=messages"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 border-b border-rhine-line/40 px-3 py-2 hover:bg-rhine-gold/5 ${
                  conversation.user.isFollowing && conversation.unread > 0
                    ? 'border-l-2 border-l-rhine-cyan bg-rhine-cyan/[0.04]'
                    : ''
                }`}
              >
                <MessageSquare className="h-3 w-3 shrink-0 text-rhine-cyan" />
                <span className="min-w-0 flex-1 truncate text-xs text-rhine-ink">
                  {conversation.user.username}
                </span>
                {conversation.user.isFollowing && (
                  <span className="border border-rhine-cyan/40 px-1 font-mono text-[8px] text-rhine-cyan">
                    关注
                  </span>
                )}
                <span className="font-mono text-[9px] text-rhine-faint">
                  {conversation.unread > 0 ? `${conversation.unread} 条` : ''}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
