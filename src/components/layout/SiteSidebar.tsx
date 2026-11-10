import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  Home,
  Image,
  Menu,
  MessageSquare,
  MessagesSquare,
  ScrollText,
  Settings,
  Shield,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSession } from '../auth/useSession'
import { userApi } from '../../lib/api'
import { THEMES, useTheme } from '../theme/ThemeProvider'
import { legal } from '../../content/legal'
import { cx } from '../../lib/cx'
import { readViewMode, writeViewMode } from '../../lib/viewMode'

interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  to: string
  visible?: boolean
}

const ARCHIVE_SECTIONS = [
  { key: 'logs', label: '日志', icon: ScrollText },
  { key: 'articles', label: '文章', icon: FileText },
  { key: 'photos', label: '照片', icon: Image },
  { key: 'videos', label: '视频', icon: Video },
  { key: 'projects', label: '项目库', icon: FolderKanban },
]

export function SiteSidebar({ children }: { children: ReactNode }) {
  const { user, staff } = useSession()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [labBooting, setLabBooting] = useState(false)
  const [unread, setUnread] = useState(0)
  const [bellAlert, setBellAlert] = useState(false)
  const previousUnread = useRef<number | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const [labTheme, setLabTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('rhine:lab3d-theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  useEffect(() => {
    const onLabTheme = (event: Event) => {
      const next = (event as CustomEvent<'light' | 'dark'>).detail
      if (next === 'light' || next === 'dark') setLabTheme(next)
    }
    window.addEventListener('rhine:lab3d-theme', onLabTheme)
    return () => window.removeEventListener('rhine:lab3d-theme', onLabTheme)
  }, [])
  const params = new URLSearchParams(location.search)
  const storedMode = readViewMode()
  const queryMode = params.get('mode')
  const routeMode: 'lab' | 'archive' =
    queryMode === 'archive' ? 'archive' : queryMode === 'lab' ? 'lab' : storedMode
  const [mode, setModeState] = useState<'lab' | 'archive'>(routeMode)
  const isArchive = location.pathname.startsWith('/archive')
  const isForum = location.pathname.startsWith('/forum')
  const pathSection = location.pathname.split('/')[2] ?? ''

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const unlock = () => {
      try {
        audioContext.current ??= new AudioContext()
        void audioContext.current.resume()
      } catch {
        /* audio unavailable */
      }
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      previousUnread.current = null
      setUnread(0)
      return undefined
    }
    let alive = true
    let timer = 0
    const playTone = () => {
      const context = audioContext.current
      if (!context || context.state !== 'running') return
      const now = context.currentTime
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
      gain.connect(context.destination)
      const first = context.createOscillator()
      first.type = 'sine'
      first.frequency.setValueAtTime(880, now)
      first.frequency.exponentialRampToValueAtTime(660, now + 0.16)
      first.connect(gain)
      first.start(now)
      first.stop(now + 0.18)
      const second = context.createOscillator()
      second.type = 'sine'
      second.frequency.setValueAtTime(1320, now + 0.12)
      second.connect(gain)
      second.start(now + 0.12)
      second.stop(now + 0.32)
    }
    const refresh = async () => {
      try {
        const [notifications, conversations] = await Promise.all([
          userApi.notifications(),
          userApi.conversations(),
        ])
        if (!alive) return
        const next =
          (notifications.unread ?? 0) +
          (conversations.conversations ?? []).reduce((sum, item) => sum + (item.unread ?? 0), 0)
        if (previousUnread.current !== null && next > previousUnread.current) {
          setBellAlert(true)
          playTone()
          window.setTimeout(() => setBellAlert(false), 2800)
        }
        previousUnread.current = next
        setUnread(next)
      } catch {
        /* keep the last known count */
      }
    }
    void refresh()
    timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 10000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [user])

  useEffect(() => {
    if (queryMode === 'lab' || queryMode === 'archive') {
      writeViewMode(queryMode)
      setModeState(queryMode)
    }
  }, [queryMode])

  useEffect(() => {
    const isLabView = (isArchive || isForum) && mode === 'lab'
    setLabBooting(isLabView)
    if (!isLabView) return undefined
    const fallback = window.setTimeout(() => setLabBooting(false), 45000)
    return () => window.clearTimeout(fallback)
  }, [isArchive, isForum, location.search, mode])

  useEffect(() => {
    const onStart = () => setLabBooting(true)
    const onReady = () => setLabBooting(false)
    window.addEventListener('rhine:lab-boot-start', onStart)
    window.addEventListener('rhine:lab-ready', onReady)
    return () => {
      window.removeEventListener('rhine:lab-boot-start', onStart)
      window.removeEventListener('rhine:lab-ready', onReady)
    }
  }, [])

  const items: NavItem[] = useMemo(
    () => [
      { key: 'home', label: '主页', icon: Home, to: '/' },
      { key: 'archive', label: '档案库', icon: Archive, to: `/archive?mode=${mode}` },
      { key: 'forum', label: '论坛', icon: MessagesSquare, to: `/forum?mode=${mode}`, visible: Boolean(user) },
      { key: 'guestbook', label: '留言板', icon: MessageSquare, to: '/guestbook' },
      { key: 'admin', label: '控制台', icon: Shield, to: '/admin', visible: Boolean(user && staff) },
    ],
    [mode, staff, user],
  )

  const setMode = (next: 'lab' | 'archive') => {
    writeViewMode(next)
    setModeState(next)
    window.dispatchEvent(new CustomEvent('rhine:mode-change', { detail: next }))
    const path = isArchive ? `/archive${pathSection ? `/${pathSection}` : ''}` : '/forum'
    navigate(`${path}?mode=${next}`)
  }

  const setTheme3d = (next: 'light' | 'dark') => {
    setLabTheme(next)
    try {
      localStorage.setItem('rhine:lab3d-theme', next)
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('rhine:lab3d-theme', { detail: next }))
  }

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-rhine-line/60 px-3">
        <Link to="/" className="flex items-center gap-2 font-display text-sm tracking-[0.18em]">
          <span className="flex h-8 w-8 items-center justify-center border border-rhine-gold/50 text-rhine-gold">
            <Archive className="h-4 w-4" />
          </span>
          {open && <span className="hidden xl:inline">HIROFJET</span>}
        </Link>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value)
            setMobileOpen(false)
          }}
          className="hidden h-8 w-8 items-center justify-center border border-rhine-line text-rhine-dim lg:flex"
          aria-label="收起导航"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="flex h-8 w-8 items-center justify-center border border-rhine-line text-rhine-dim lg:hidden"
          aria-label="关闭导航"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <p className="mb-2 px-2 font-mono text-[8px] tracking-[0.25em] text-rhine-faint">SYSTEM</p>
        {items.filter((item) => item.visible !== false).map((item) => {
          const Icon = item.icon
          const active =
            item.key === 'home'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to.split('?')[0])
          return (
            <Link
              key={item.key}
              to={item.to}
              aria-label={item.label}
              className={cx(
                'mb-1 flex h-11 items-center gap-3 border-l-2 px-2 transition-colors',
                active
                  ? 'border-rhine-gold bg-rhine-gold/10 text-rhine-gold'
                  : 'border-transparent text-rhine-dim hover:bg-rhine-panel/50 hover:text-rhine-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="site-nav-label text-xs">{item.label}</span>
            </Link>
          )
        })}

        {isArchive && (
          <div className="mt-5 border-t border-rhine-line/50 pt-4">
            <p className="mb-2 px-2 font-mono text-[8px] tracking-[0.22em] text-rhine-faint">
              ARCHIVE / 二级
            </p>
            {ARCHIVE_SECTIONS.map((section, index) => {
              const Icon = section.icon
              return (
                <button
                  key={section.key}
                  type="button"
                  aria-label={section.label}
                  onClick={() => {
                    if (mode === 'lab') {
                      window.dispatchEvent(
                        new CustomEvent('rhine:lab-column', { detail: index + 1 }),
                      )
                    } else {
                      navigate(`/archive/${section.key}?mode=archive`)
                    }
                  }}
                  className={cx(
                    'mb-1 flex h-9 w-full items-center gap-3 border-l-2 px-2 text-left',
                    mode === 'archive' && pathSection === section.key
                      ? 'border-rhine-gold bg-rhine-gold/10 text-rhine-gold'
                      : 'border-transparent text-rhine-dim hover:text-rhine-cyan',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="site-nav-label text-[11px]">{section.label}</span>
                </button>
              )
            })}
          </div>
        )}

      </nav>

      {(isArchive || isForum) && (
        <div className="border-t border-rhine-line/60 px-2 py-3">
          <p className="mb-2 px-2 font-mono text-[8px] tracking-[0.22em] text-rhine-faint">MODE</p>
          <div className="space-y-1">
            {(['lab', 'archive'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-label={value === 'lab' ? 'LAB MODE' : 'ARCHIVE MODE'}
                onClick={() => setMode(value)}
                className={cx(
                  'flex h-9 w-full items-center gap-2 border px-2 text-left font-mono text-[8px] tracking-[0.08em]',
                  mode === value
                    ? 'border-rhine-gold bg-rhine-gold/10 text-rhine-gold'
                    : 'border-rhine-line/60 text-rhine-dim hover:text-rhine-ink',
                )}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="site-nav-label whitespace-nowrap">
                  {value === 'lab' ? 'LAB MODE' : 'ARCHIVE MODE'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative border-t border-rhine-line/60 p-2">
        <Link
          to="/messages"
          aria-label={unread > 0 ? `消息，${unread} 条未读` : '消息'}
          className={cx(
            'relative mb-1 flex h-10 items-center gap-3 px-2 hover:text-rhine-cyan',
            bellAlert ? 'text-rhine-gold' : 'text-rhine-dim',
          )}
        >
          <Bell className={cx('h-4 w-4', bellAlert && 'bell-swing')} />
          <span className="site-nav-label text-xs">消息</span>
          {unread > 0 && (
            <span className="absolute top-1 left-6 min-w-[14px] rounded-full bg-rhine-red px-1 text-center font-mono text-[8px] leading-4 text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        {user ? (
          <Link to="/profile" aria-label="用户资料" className="flex h-10 items-center gap-3 px-2 text-rhine-dim hover:text-rhine-gold">
            <UserRound className="h-4 w-4" />
            <span className="site-nav-label text-xs">{user.nickname || user.username}</span>
          </Link>
        ) : (
          <Link to="/login" aria-label="登录" className="flex h-10 items-center gap-3 px-2 text-rhine-dim hover:text-rhine-gold">
            <UserRound className="h-4 w-4" />
            <span className="site-nav-label text-xs">登录</span>
          </Link>
        )}
        {settingsOpen && (
          <div className="mb-2 w-full min-w-0 space-y-3 border-t border-rhine-line/50 pt-3">
            <div className="sidebar-settings">
              <p className="mb-1 font-mono text-[8px] tracking-[0.2em] text-rhine-faint">页面主题</p>
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as typeof theme)}
                className="h-8 w-full min-w-0 border border-rhine-line bg-rhine-abyss px-1.5 font-mono text-[9px] text-rhine-ink"
              >
                {THEMES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="sidebar-settings">
              <p className="mb-1 font-mono text-[8px] tracking-[0.2em] text-rhine-faint">3D 档案主题</p>
              <select
                value={labTheme}
                onChange={(event) => setTheme3d(event.target.value as 'light' | 'dark')}
                className="h-8 w-full min-w-0 border border-rhine-line bg-rhine-abyss px-1.5 font-mono text-[9px] text-rhine-ink"
              >
                <option value="light">亮色</option>
                <option value="dark">暗色</option>
              </select>
            </div>
            <Link
              to="/legal"
              className="block border-t border-rhine-line/50 pt-2 font-mono text-[8px] tracking-[0.16em] text-rhine-faint hover:text-rhine-gold"
            >
              法律 · 版权 · 开源声明
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen((value) => !value)}
          aria-label="设置"
          className="mt-1 flex h-10 w-full items-center gap-3 px-2 text-rhine-dim hover:text-rhine-gold"
        >
          <Settings className="h-4 w-4" />
          <span className="site-nav-label text-xs">设置</span>
          <ChevronDown className={cx('ml-auto h-3 w-3', settingsOpen && 'rotate-180')} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {!open && !labBooting && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed top-3 left-3 z-50 hidden h-10 w-10 items-center justify-center border border-rhine-line bg-rhine-panel text-rhine-ink shadow-[0_10px_30px_rgb(0_0_0/0.12)] lg:flex"
          aria-label="展开导航"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={cx(
          'fixed top-3 left-3 z-50 flex h-10 w-10 items-center justify-center border border-rhine-line bg-rhine-panel text-rhine-ink lg:hidden',
          labBooting && 'hidden',
        )}
        aria-label="展开导航"
      >
        <Menu className="h-5 w-5" />
      </button>
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-rhine-line bg-rhine-abyss/95 backdrop-blur lg:block',
          labBooting && open ? 'pointer-events-none -translate-x-full' : '',
          open ? 'w-[76px] xl:w-[220px]' : 'w-0 overflow-hidden border-r-0',
        )}
      >
        {nav}
      </aside>
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 w-[240px] border-r border-rhine-line bg-rhine-abyss transition-transform lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {nav}
      </aside>
      {mobileOpen && (
        <button
          type="button"
          aria-label="关闭导航遮罩"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}
      <div className={cx('min-h-screen transition-[margin] lg:block', !labBooting && open ? 'lg:ml-[76px] xl:ml-[220px]' : 'lg:ml-0')}>
        <main className="min-h-screen">{children}</main>
        <SiteFooter />
      </div>
    </>
  )
}

function SiteFooter() {
  const year = new Date().getFullYear()
  const icpNumber = legal.icp.number || legal.icp.placeholder
  return (
    <footer className="border-t border-rhine-line/50 px-6 py-4 text-center font-mono text-[9px] leading-relaxed tracking-[0.18em] text-rhine-faint">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>© {year} {legal.owner} · 保留所有权利</span>
        <Link to="/legal" className="text-rhine-cyan hover:text-rhine-gold">
          版权与开源声明
        </Link>
        <Link to="/privacy" className="text-rhine-cyan hover:text-rhine-gold">
          隐私政策
        </Link>
        <Link to="/terms" className="text-rhine-cyan hover:text-rhine-gold">
          用户协议
        </Link>
        <Link to="/complaints" className="text-rhine-cyan hover:text-rhine-gold">
          投诉举报
        </Link>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <a
          href={legal.icp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-rhine-gold"
        >
          {legal.icp.label}：{icpNumber}
        </a>
        {legal.publicSecurity.number ? (
          <a
            href={legal.publicSecurity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-rhine-gold"
          >
            {legal.publicSecurity.label}：{legal.publicSecurity.number}
          </a>
        ) : (
          <span>
            {legal.publicSecurity.label}：{legal.publicSecurity.placeholder}
          </span>
        )}
        <span>HIROFJET//HOME · SYSTEM INTERFACE</span>
      </div>
    </footer>
  )
}
