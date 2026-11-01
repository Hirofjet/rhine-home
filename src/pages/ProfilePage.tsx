/* oxlint-disable react/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Send,
  Upload,
  UserRound,
} from 'lucide-react'
import {
  errorMessage,
  forumApi,
  resolveMediaUrl,
  ROLE_LABELS,
  uploadFile,
  userApi,
  type ChatMessage,
  type Conversation,
  type NotificationItem,
} from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { ForumAuthModal } from '../components/forum/ForumAuthModal'
import { formatDateTime, STATUS_LABELS, STATUS_STYLES } from '../lib/format'

type Tab = 'profile' | 'notifications' | 'messages' | 'posts'

export function ProfilePage() {
  const { user, loading, refresh } = useSession()
  const [tab, setTab] = useState<Tab>('profile')
  const [authOpen, setAuthOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [gender, setGender] = useState(user?.gender ?? '')
  const [birthday, setBirthday] = useState(user?.birthday ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [tags, setTags] = useState((user?.tags ?? []).join(' '))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const avatarInput = useRef<HTMLInputElement | null>(null)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [chatUser, setChatUser] = useState<Conversation['user'] | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const [myPosts, setMyPosts] = useState<
    Array<{
      id: number
      title: string
      status: string
      createdAt: string
      board: { slug: string; name: string }
    }>
  >([])

  useEffect(() => {
    if (!user) return
    setAvatarUrl(user.avatarUrl ?? '')
    setGender(user.gender ?? '')
    setBirthday(user.birthday ?? '')
    setBio(user.bio ?? '')
    setTags((user.tags ?? []).join(' '))
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    let alive = true
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
    forumApi
      .my()
      .then((data) => {
        if (alive) setMyPosts(data.posts)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [user])

  useEffect(() => {
    if (!user || !chatUser) return undefined
    let alive = true
    userApi
      .messagesWith(chatUser.id)
      .then((data) => {
        if (alive) setChatMessages(data.messages)
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
  }, [user, chatUser])

  const uploadAvatar = async (file?: File) => {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setError('头像不能超过 20MB')
      return
    }
    setUploading(true)
    setError('')
    try {
      const uploaded = await uploadFile(file, 'photo')
      setAvatarUrl(uploaded.url)
      setNotice('头像已上传，点击保存后生效')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
      if (avatarInput.current) avatarInput.current.value = ''
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await userApi.updateProfile({
        avatarUrl,
        gender,
        birthday,
        bio,
        tags: tags.split(/[,，\s]+/).filter(Boolean),
      })
      await refresh()
      setNotice('资料已保存')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const readAll = async () => {
    try {
      await userApi.readNotifications()
      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const sendChat = async () => {
    if (!chatUser || !chatText.trim()) return
    try {
      await userApi.sendDm(chatUser.id, chatText.trim())
      setChatText('')
      const data = await userApi.messagesWith(chatUser.id)
      setChatMessages(data.messages)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          LOADING PROFILE …
        </p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-md px-4 pb-24 pt-32 text-center sm:px-6">
        <UserRound className="mx-auto h-8 w-8 text-rhine-gold" />
        <p className="mt-3 font-mono text-[11px] tracking-wider text-rhine-dim">
          登录后进入个人主页
        </p>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="mt-5 border border-rhine-gold/60 bg-rhine-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold"
        >
          登录 / 注册
        </button>
        <ForumAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </section>
    )
  }

  const avatar = avatarUrl ? resolveMediaUrl(avatarUrl) : ''

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">
      <div className="flex flex-wrap items-center gap-4 border border-rhine-line/70 bg-rhine-panel/40 p-5">
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt={user.username}
              className="h-20 w-20 rounded-full border border-rhine-gold/50 object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-rhine-line bg-rhine-abyss font-display text-2xl text-rhine-gold">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          )}
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void uploadAvatar(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-rhine-line bg-rhine-panel text-rhine-dim hover:text-rhine-gold"
            aria-label="上传头像"
          >
            <Upload className="h-3 w-3" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg text-rhine-ink">{user.username}</p>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-rhine-faint">
            {ROLE_LABELS[user.role]} · {user.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(user.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="border border-rhine-line px-1.5 py-0.5 font-mono text-[9px] text-rhine-cyan"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-rhine-line/60">
        {(
          [
            ['profile', '资料'],
            ['notifications', `通知${notifications.filter((n) => !n.read).length ? ' •' : ''}`],
            ['messages', '私信'],
            ['posts', '我的帖子'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 font-mono text-[11px] tracking-[0.16em] ${
              tab === key
                ? 'border-b-2 border-rhine-gold text-rhine-gold'
                : 'text-rhine-faint hover:text-rhine-dim'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] text-rhine-red">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 border border-rhine-green/40 bg-rhine-green/5 px-3 py-2 font-mono text-[10px] text-rhine-green">
          {notice}
        </p>
      )}

      {tab === 'profile' && (
        <div className="mt-5 space-y-3 border border-rhine-line/70 bg-rhine-panel/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">性别</span>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="w-full border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-xs text-rhine-ink outline-none"
              >
                <option value="">不公开</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">生日</span>
              <input
                type="date"
                value={birthday}
                onChange={(event) => setBirthday(event.target.value)}
                className="w-full border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-xs text-rhine-ink outline-none"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">简介</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="min-h-24 w-full resize-y border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 text-sm text-rhine-ink outline-none"
              placeholder="介绍一下自己"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">标签</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="w-full border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-xs text-rhine-ink outline-none"
              placeholder="用空格分隔，例如：画画 游戏 音乐"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={saving}
              className="border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] tracking-[0.16em] text-rhine-gold"
            >
              {saving ? '保存中…' : '保存资料'}
            </button>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="mt-5 border border-rhine-line/70 bg-rhine-panel/30">
          <div className="flex items-center justify-between border-b border-rhine-line/60 px-4 py-2">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
              <Bell className="h-3 w-3" /> 通知
            </p>
            <button
              type="button"
              onClick={() => void readAll()}
              className="flex items-center gap-1 font-mono text-[10px] text-rhine-dim hover:text-rhine-gold"
            >
              <CheckCheck className="h-3 w-3" /> 全部已读
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 font-mono text-[10px] text-rhine-faint">暂无通知</p>
          ) : (
            <ul className="divide-y divide-rhine-line/50">
              {notifications.map((item) => (
                <li key={item.id} className={`px-4 py-3 ${item.read ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-rhine-ink">{item.title}</span>
                    <span className="font-mono text-[9px] text-rhine-faint">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  {item.content && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-rhine-dim">{item.content}</p>
                  )}
                  {item.link && item.link.startsWith('/') && (
                    <Link to={item.link} className="mt-1 inline-block font-mono text-[10px] text-rhine-cyan">
                      查看详情 →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr]">
          <div className="border border-rhine-line/70 bg-rhine-panel/30">
            <p className="border-b border-rhine-line/60 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
              私信
            </p>
            {conversations.length === 0 ? (
              <p className="px-3 py-4 font-mono text-[10px] text-rhine-faint">暂无私信</p>
            ) : (
              <ul>
                {conversations.map((conversation) => (
                  <li key={conversation.user.id}>
                    <button
                      type="button"
                      onClick={() => setChatUser(conversation.user)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                        chatUser?.id === conversation.user.id
                          ? 'bg-rhine-gold/10 text-rhine-gold'
                          : 'text-rhine-dim hover:bg-rhine-gold/5'
                      }`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                        {conversation.user.username}
                      </span>
                      {conversation.unread > 0 && (
                        <span className="rounded-full bg-rhine-red/20 px-1.5 font-mono text-[9px] text-rhine-red">
                          {conversation.unread}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex min-h-64 flex-col border border-rhine-line/70 bg-rhine-panel/30">
            {chatUser ? (
              <>
                <p className="border-b border-rhine-line/60 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                  {chatUser.username}
                </p>
                <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[80%] border px-2 py-1.5 text-xs ${
                        message.fromMe
                          ? 'ml-auto border-rhine-gold/40 bg-rhine-gold/10 text-rhine-gold'
                          : 'border-rhine-line bg-rhine-abyss/50 text-rhine-dim'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-rhine-line/60 p-2">
                  <input
                    value={chatText}
                    onChange={(event) => setChatText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void sendChat()
                    }}
                    placeholder="输入私信…"
                    className="min-w-0 flex-1 bg-transparent px-2 py-1 font-mono text-xs text-rhine-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void sendChat()}
                    className="border border-rhine-gold/50 px-2 text-rhine-gold"
                    aria-label="发送"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center font-mono text-[10px] text-rhine-faint">
                选择一个会话
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <div className="mt-5 border border-rhine-line/70 bg-rhine-panel/30">
          {myPosts.length === 0 ? (
            <p className="px-4 py-6 font-mono text-[10px] text-rhine-faint">还没有发布帖子</p>
          ) : (
            <ul className="divide-y divide-rhine-line/50">
              {myPosts.map((post) => (
                <li key={post.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <Link
                    to={`/forum/post/${post.id}`}
                    className="min-w-0 flex-1 truncate text-xs text-rhine-ink hover:text-rhine-gold"
                  >
                    {post.title}
                  </Link>
                  <span className="font-mono text-[9px] text-rhine-faint">{post.board.name}</span>
                  <span
                    className={`border px-1.5 py-0.5 font-mono text-[9px] ${
                      STATUS_STYLES[post.status] ?? 'border-rhine-line text-rhine-faint'
                    }`}
                  >
                    {STATUS_LABELS[post.status] ?? post.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
