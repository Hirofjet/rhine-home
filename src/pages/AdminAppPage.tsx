/* oxlint-disable react/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CheckCheck,
  Download,
  KeyRound,
  LogOut,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import { AdminDashboard } from '../components/admin/AdminDashboard'
import { useSession } from '../components/auth/useSession'
import {
  appApi,
  errorMessage,
  ROLE_LABELS,
  userApi,
  type NotificationItem,
} from '../lib/api'
import { formatDateTime } from '../lib/format'

const BASE = import.meta.env.BASE_URL
const SW_URL = `${BASE}app-sw.js`
const SW_SCOPE = `${BASE}app/`
const MANIFEST_URL = `${BASE}app-manifest.webmanifest`

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const load = () => {
    userApi
      .notifications()
      .then((data) => {
        setItems(data.notifications)
        setUnread(data.unread)
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 20000)
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('mousedown', onClick)
    }
  }, [])

  const markAll = async () => {
    setBusy(true)
    try {
      await userApi.readNotifications()
      setItems((current) => current.map((item) => ({ ...item, read: true })))
      setUnread(0)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
          if (!open) load()
        }}
        className="relative flex h-8 w-8 items-center justify-center border border-rhine-line text-rhine-dim hover:border-rhine-gold/50 hover:text-rhine-gold"
        aria-label="消息通知"
      >
        <Bell className="h-3.5 w-3.5" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-rhine-red px-1 text-center font-mono text-[8px] leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-[70] mt-2 w-[min(92vw,380px)] border border-rhine-line bg-rhine-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-rhine-line/60 px-3 py-2">
            <span className="font-mono text-[9px] tracking-[0.22em] text-rhine-gold">
              ADMIN MESSAGES
            </span>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={busy || unread === 0}
              className="flex items-center gap-1 font-mono text-[9px] text-rhine-dim hover:text-rhine-gold disabled:opacity-40"
            >
              <CheckCheck className="h-3 w-3" /> 全部已读
            </button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center font-mono text-[10px] text-rhine-faint">
                暂无通知
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`border-b border-rhine-line/40 px-3 py-2.5 last:border-b-0 ${
                    item.read ? 'opacity-60' : 'bg-rhine-gold/[0.04]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.read ? 'bg-rhine-line' : 'bg-rhine-gold'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-rhine-ink">{item.title}</p>
                      {item.content && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-rhine-dim">
                          {item.content}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-[8px] tracking-wider text-rhine-faint">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminAppPage() {
  const { user, loading, staff, login, logout } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(isStandalone)
  const [pushState, setPushState] = useState<
    'idle' | 'working' | 'ready' | 'denied' | 'unsupported' | 'error'
  >('idle')
  const [pushMessage, setPushMessage] = useState('')
  const swRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (window.location.pathname.endsWith('/app')) {
      window.location.replace(`${BASE}app/`)
    }
  }, [])

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setStandalone(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    document.title = 'HIROFJET ADMIN'
    const existing = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    const previous = existing?.getAttribute('href') ?? null
    if (existing) {
      existing.setAttribute('href', MANIFEST_URL)
    } else {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.id = 'admin-app-manifest'
      link.href = MANIFEST_URL
      document.head.appendChild(link)
    }
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    theme?.setAttribute('content', '#05070b')
    const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    const previousApple = apple?.getAttribute('href') ?? null
    if (apple) apple.setAttribute('href', `${BASE}icons/apple-touch-icon.png`)
    return () => {
      if (existing && previous) existing.setAttribute('href', previous)
      if (apple && previousApple) apple.setAttribute('href', previousApple)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register(SW_URL, { scope: SW_SCOPE, updateViaCache: 'none' })
      .then(async (registration) => {
        swRef.current = registration
        await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) setPushState('ready')
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!user || staff) return
    setError('该账号没有管理员权限，无法使用管理 App。')
    void logout()
  }, [user, staff, logout])

  const submit = async () => {
    if (!username.trim() || !password || busy) return
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password, mfaCode.trim(), true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setStandalone(true)
    setInstallPrompt(null)
  }

  const enablePush = async () => {
    if (pushState === 'working') return
    setPushMessage('')
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPushState('unsupported')
      setPushMessage('当前浏览器不支持 Web Push，请使用 Chrome / Edge / Safari 16.4+。')
      return
    }
    setPushState('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushState('denied')
        setPushMessage('通知权限被拒绝，请在浏览器设置中允许通知。')
        return
      }
      const registration =
        swRef.current ||
        (await navigator.serviceWorker.register(SW_URL, {
          scope: SW_SCOPE,
          updateViaCache: 'none',
        }))
      swRef.current = registration
      await navigator.serviceWorker.ready
      const { publicKey } = await appApi.pushKey()
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }
      await appApi.subscribe(subscription.toJSON())
      setPushState('ready')
      setPushMessage('通知已开启，新的审核/举报消息会显示在这里。')
    } catch (err) {
      setPushState('error')
      setPushMessage(errorMessage(err))
    }
  }

  const testPush = async () => {
    setPushMessage('')
    try {
      const data = await appApi.testPush()
      setPushMessage(
        data.sent > 0
          ? '测试通知已发送，请查看系统通知。'
          : '已请求发送，但当前设备没有有效订阅。',
      )
    } catch (err) {
      setPushMessage(errorMessage(err))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rhine-abyss">
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.35em] text-rhine-faint">
          ADMIN AUTHENTICATING …
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-rhine-abyss px-4 py-10 text-rhine-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(200,170,90,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(200,170,90,.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative w-full max-w-sm border border-rhine-line bg-rhine-panel/80 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3 border-b border-rhine-line/60 pb-4">
            <span className="flex h-10 w-10 items-center justify-center border border-rhine-gold/50 text-rhine-gold">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[9px] tracking-[0.28em] text-rhine-gold">
                HIROFJET // ADMIN
              </p>
              <h1 className="mt-0.5 text-lg font-bold">管理员 App</h1>
            </div>
          </div>
          <p className="mt-4 font-mono text-[10px] leading-relaxed text-rhine-dim">
            仅限拥有后台权限的账号登录。此 App 不提供注册，普通用户无法查看任何管理内容。
          </p>
          <div className="mt-5 space-y-3">
            <label className="block space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
                管理员账号
              </span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 text-sm outline-none focus:border-rhine-gold/60"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
                密码
              </span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submit()
                }}
                className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 text-sm outline-none focus:border-rhine-gold/60"
              />
            </label>
            <label className="block space-y-1">
              <span className="flex items-center gap-1 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
                <KeyRound className="h-3 w-3" /> 动态验证码（如已启用 MFA）
              </span>
              <input
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 位数字，可留空"
                className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-sm tracking-[0.3em] outline-none focus:border-rhine-gold/60"
              />
            </label>
          </div>
          {error && (
            <p className="mt-3 border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] text-rhine-red">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !username.trim() || !password}
            className="mt-4 flex w-full items-center justify-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2.5 font-mono text-[10px] tracking-[0.22em] text-rhine-gold disabled:opacity-40"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> {busy ? 'VERIFYING…' : '管理员登录'}
          </button>
          <p className="mt-4 text-center font-mono text-[8px] tracking-wider text-rhine-faint">
            NO REGISTRATION · STAFF ONLY
          </p>
        </div>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rhine-abyss px-4">
        <div className="w-full max-w-sm border border-rhine-red/40 bg-rhine-panel/50 p-6 text-center">
          <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-red">ACCESS DENIED</p>
          <p className="mt-3 text-sm text-rhine-ink">该账号没有管理员权限。</p>
          <p className="mt-1 font-mono text-[10px] text-rhine-faint">
            {user.username} · {ROLE_LABELS[user.role]}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-5 border border-rhine-line px-4 py-2 font-mono text-[10px] text-rhine-dim hover:text-rhine-gold"
          >
            退出登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-density min-h-screen bg-rhine-abyss text-rhine-ink">
      <header className="sticky top-0 z-50 border-b border-rhine-line/70 bg-rhine-abyss/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-rhine-gold/50 text-rhine-gold">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] tracking-[0.24em] text-rhine-gold">
                HIROFJET // ADMIN APP
              </p>
              <p className="truncate font-mono text-[9px] text-rhine-faint">
                {user.nickname || user.username} · {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!standalone && installPrompt && (
              <button
                type="button"
                onClick={() => void install()}
                className="hidden items-center gap-1 border border-rhine-line px-2 py-1.5 font-mono text-[9px] text-rhine-dim hover:text-rhine-gold sm:flex"
              >
                <Download className="h-3 w-3" /> 安装
              </button>
            )}
            {standalone && (
              <span className="hidden items-center gap-1 font-mono text-[8px] text-rhine-green sm:flex">
                <Smartphone className="h-3 w-3" /> INSTALLED
              </span>
            )}
            <button
              type="button"
              onClick={() => void (pushState === 'ready' ? testPush() : enablePush())}
              className="flex items-center gap-1 border border-rhine-line px-2 py-1.5 font-mono text-[9px] text-rhine-dim hover:text-rhine-gold"
            >
              <Bell className="h-3 w-3" />
              {pushState === 'ready' ? '测试通知' : pushState === 'working' ? '开启中…' : '开启通知'}
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-8 items-center gap-1 border border-rhine-line px-2 font-mono text-[9px] text-rhine-dim hover:border-rhine-red/50 hover:text-rhine-red"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
        {pushMessage && (
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-2 border-t border-rhine-line/40 px-3 py-1.5 sm:px-6">
            <p className="font-mono text-[9px] leading-relaxed text-rhine-cyan">{pushMessage}</p>
            <button
              type="button"
              onClick={() => setPushMessage('')}
              className="text-rhine-faint hover:text-rhine-ink"
              aria-label="关闭提示"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </header>
      <AdminDashboard user={user} />
    </div>
  )
}
