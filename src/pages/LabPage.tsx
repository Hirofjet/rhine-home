import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  FolderKanban,
  Home,
  Image,
  LogIn,
  MessageSquare,
  MessagesSquare,
  ScrollText,
  Shield,
  UserRound,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { THEMES, useTheme } from '../components/theme/ThemeProvider'
import type { ThemeId } from '../components/theme/ThemeProvider'
import { useSession } from '../components/auth/useSession'
import { accessLogApi, themeApi } from '../lib/api'
import { GuestbookPage } from './GuestbookPage'
import { ForumLabPage } from './ForumLabPage'
import { ProfilePage } from './ProfilePage'
import { AdminPage } from './AdminPage'

type LabView = 'archive' | 'forum' | 'guestbook' | 'admin' | 'profile'

interface LabModule {
  key: string
  label: string
  icon: LucideIcon
  column?: number
  view?: LabView
}

const MODULES: LabModule[] = [
  { key: 'home', label: '主页', icon: Home, column: 1 },
  { key: 'articles', label: '文章', icon: FileText, column: 2 },
  { key: 'photos', label: '照片', icon: Image, column: 3 },
  { key: 'videos', label: '视频', icon: Video, column: 4 },
  { key: 'projects', label: '项目库', icon: FolderKanban, column: 5 },
  { key: 'logs', label: '日志', icon: ScrollText, column: 6 },
  { key: 'forum', label: '论坛', icon: MessagesSquare, view: 'forum' },
  { key: 'guestbook', label: '留言板', icon: MessageSquare, view: 'guestbook' },
  { key: 'admin', label: '控制台', icon: Shield, view: 'admin' },
  { key: 'user', label: '用户', icon: UserRound, view: 'profile' },
]

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const LAB_THEME: Record<ThemeId, string> = {
  rhine: 'light',
  'rhine-dark': 'dark',
  archive: 'archive',
  sakura: 'sakura',
  noctis: 'noctis',
}
const HOME_THEME: Record<string, ThemeId> = {
  light: 'rhine',
  dark: 'rhine-dark',
  archive: 'archive',
  sakura: 'sakura',
  noctis: 'noctis',
}

/** Lab 系统：统一导航 + 3D 档案 + 内部子页面，除系统切换外不离开 Lab。 */
export function LabPage() {
  const { theme, definition, setTheme } = useTheme()
  const { user, staff, login, logout } = useSession()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [frameVersion, setFrameVersion] = useState(0)
  const [inScene, setInScene] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [activeColumn, setActiveColumn] = useState(1)
  const [view, setView] = useState<LabView>('archive')
  const [visited, setVisited] = useState<Set<LabView>>(new Set(['archive']))
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [customColors, setCustomColors] = useState<[string, string, string] | null>(null)
  const navigating = useRef(false)

  const dark = theme === 'rhine-dark' || theme === 'noctis'
  const bootUser = user?.nickname || user?.username || 'Unknown Visitor'
  const currentTheme = THEMES.find((item) => item.id === theme) ?? THEMES[0]
  const visibleModules = MODULES.filter((module) => {
    if (module.key === 'forum') return Boolean(user)
    if (module.key === 'admin') return Boolean(user && staff)
    return true
  })

  useEffect(() => {
    if (!user && (view === 'forum' || view === 'admin')) {
      setView('archive')
    }
    if (!staff && view === 'admin') setView('archive')
  }, [staff, user, view])

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const shortcut = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]')
    const previous = icon?.href
    const previousShortcut = shortcut?.href
    if (icon) icon.href = '/lab-favicon.svg'
    if (shortcut) shortcut.href = '/lab-favicon.svg'
    return () => {
      if (icon && previous) icon.href = previous
      if (shortcut && previousShortcut) shortcut.href = previousShortcut
    }
  }, [])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'rhine:theme-change') return
      const next = HOME_THEME[String(event.data.theme)]
      if (next) setTheme(next)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [setTheme])

  useEffect(() => {
    if (!theme.startsWith('custom-')) {
      setCustomColors(null)
      return
    }
    const id = Number(theme.slice('custom-'.length))
    themeApi
      .list()
      .then(({ themes }) => {
        const found = themes.find((item) => item.id === id)
        setCustomColors(
          found
            ? [found.primary_color, found.secondary_color, found.tertiary_color]
            : null,
        )
      })
      .catch(() => setCustomColors(null))
  }, [theme])

  useEffect(() => {
    if (!loaded || !customColors) return undefined
    const apply = () => {
      const doc = iframeRef.current?.contentDocument
      const root = doc?.documentElement
      if (!root) return
      const [primary, secondary, tertiary] = customColors
      const luminance = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255
      }
      const dark = luminance(primary) < 0.45
      root.dataset.labTheme = 'custom'
      let style = doc?.getElementById('rhine-custom-theme') as HTMLStyleElement | null
      if (!style) {
        style = doc?.createElement('style')
        style.id = 'rhine-custom-theme'
        doc?.head.appendChild(style)
      }
      style.textContent = `
        html[data-lab-theme="custom"] {
          --theme-paper: ${primary} !important;
          --theme-panel: ${primary} !important;
          --theme-field: ${primary} !important;
          --theme-accent: ${secondary} !important;
          --theme-line: ${secondary} !important;
          --theme-ink: ${dark ? '#f2eee5' : '#171512'} !important;
          --theme-muted: ${dark ? '#b8b2a6' : '#5b554c'} !important;
          --theme-tertiary: ${tertiary} !important;
        }
      `
    }
    apply()
    const timer = window.setInterval(apply, 600)
    return () => window.clearInterval(timer)
  }, [customColors, loaded, frameVersion])

  useEffect(() => {
    if (!loaded) return
    const target = iframeRef.current?.contentWindow
    if (!target) return
    if (definition.custom) {
      target.postMessage(
        { type: 'rhine:set-custom-theme', colors: definition.colors },
        window.location.origin,
      )
    } else {
      target.postMessage(
        { type: 'rhine:set-lab-theme', theme: LAB_THEME[theme] },
        window.location.origin,
      )
    }
  }, [definition, theme, loaded, frameVersion])

  useEffect(() => {
    if (user) {
      void accessLogApi
        .write({ moduleType: 'lab', targetType: 'archive', targetTitle: 'RHINE LAB 3D Archive' })
        .catch(() => undefined)
    }
  }, [user])

  useEffect(() => {
    if (!loaded) return undefined
    const timer = window.setInterval(() => {
      const doc = iframeRef.current?.contentDocument
      if (!doc) return
      const value = Number(doc.querySelector('#column-index')?.textContent ?? '')
      if (Number.isFinite(value) && value > 0) setActiveColumn(value)
      const columnButton = doc.querySelector<HTMLElement>('[data-action="column-next"]')
      if (columnButton && columnButton.getBoundingClientRect().width > 0) setInScene(true)
    }, 700)
    return () => window.clearInterval(timer)
  }, [loaded])

  const openView = (next: LabView) => {
    setView(next)
    setVisited((items) => new Set(items).add(next))
  }

  const goToColumn = async (column: number) => {
    openView('archive')
    const doc = iframeRef.current?.contentDocument
    if (!doc || navigating.current) return
    navigating.current = true
    try {
      const direct = (
        iframeRef.current?.contentWindow as unknown as {
          __rhineGoToColumn?: (lane: number) => void
        }
      )?.__rhineGoToColumn
      if (direct) {
        direct(column - 1)
        setActiveColumn(column)
        return
      }
      for (let guard = 0; guard < 10; guard += 1) {
        const current = Number(doc.querySelector('#column-index')?.textContent ?? '0')
        if (current === column) break
        const action = current < column || current === 0 ? 'column-next' : 'column-prev'
        doc.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click()
        await wait(450)
      }
      setActiveColumn(column)
    } finally {
      navigating.current = false
    }
  }

  const submitLogin = async () => {
    if (!loginName.trim() || !loginPassword) return
    setLoginError('')
    try {
      await login(loginName.trim(), loginPassword)
      setLoginPassword('')
      openView('profile')
    } catch {
      setLoginError('登录失败，请检查账号和密码。')
    }
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#05070b]">
      <div className={`absolute inset-0 transition-opacity ${view === 'archive' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <iframe
          ref={iframeRef}
          title="RHINE LAB // HIROFJET ARCHIVE"
          src={`/rhine-lab/index.html?theme=${LAB_THEME[theme]}&user=${encodeURIComponent(bootUser)}${
            definition.custom ? `&custom=${encodeURIComponent(definition.colors.join(','))}` : ''
          }`}
          onLoad={() => {
            setLoaded(true)
            setFrameVersion((value) => value + 1)
          }}
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>

      {!loaded && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#e8e5e1] text-[#111]">
          <div className="text-center font-mono">
            <p className="text-[10px] tracking-[0.5em]">RHINE LAB</p>
            <div className="mx-auto mt-5 h-px w-48 overflow-hidden bg-black/20">
              <span className="block h-full w-1/2 animate-scan bg-black" />
            </div>
            <p className="mt-4 text-[8px] tracking-[0.35em] opacity-50">CONNECTING PERSONAL ARCHIVE</p>
          </div>
        </div>
      )}

      {visited.has('forum') && (
        <section
          className="absolute inset-0 z-20"
          aria-hidden={view !== 'forum'}
          style={{
            visibility: view === 'forum' ? 'visible' : 'hidden',
            pointerEvents: view === 'forum' ? 'auto' : 'none',
          }}
        >
          <ForumLabPage embedded active={view === 'forum'} />
        </section>
      )}

      {visited.has('guestbook') && (
        <section className={`absolute inset-0 z-20 overflow-y-auto bg-rhine-abyss ${view === 'guestbook' ? '' : 'hidden'}`}>
          <GuestbookPage embedded />
        </section>
      )}

      {visited.has('admin') && (
        <section className={`absolute inset-0 z-20 overflow-y-auto bg-rhine-abyss ${view === 'admin' ? '' : 'hidden'}`}>
          <AdminPage embedded />
        </section>
      )}

      <section className={`absolute inset-0 z-20 overflow-y-auto bg-rhine-abyss lg:left-[76px] ${view === 'profile' ? '' : 'hidden'}`}>
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => void logout()}
              className="absolute top-4 right-4 z-30 border border-rhine-line px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-rhine-dim"
            >
              LOGOUT
            </button>
            <ProfilePage />
          </div>
        ) : (
          <div className="flex min-h-screen items-center justify-center px-5 pt-24">
            <div className="w-full max-w-sm border border-rhine-line bg-rhine-panel/70 p-6">
              <p className="font-mono text-[9px] tracking-[0.28em] text-rhine-gold">LAB USER ACCESS</p>
              <h2 className="mt-3 font-display text-2xl tracking-[0.08em]">用户登录</h2>
              <input
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
                placeholder="用户名"
                className="mt-5 w-full border border-rhine-line bg-rhine-abyss px-3 py-2 text-sm outline-none focus:border-rhine-gold/60"
              />
              <input
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void submitLogin()}
                type="password"
                placeholder="密码"
                className="mt-3 w-full border border-rhine-line bg-rhine-abyss px-3 py-2 text-sm outline-none focus:border-rhine-gold/60"
              />
              {loginError && <p className="mt-3 font-mono text-[10px] text-rhine-red">{loginError}</p>}
              <button
                type="button"
                onClick={() => void submitLogin()}
                className="mt-4 flex w-full items-center justify-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-rhine-gold"
              >
                <LogIn className="h-3.5 w-3.5" /> LOGIN
              </button>
            </div>
          </div>
        )}
      </section>

      <aside
        className={`absolute inset-y-0 left-0 z-30 hidden w-[76px] flex-col items-center border-r py-4 transition-transform duration-300 lg:flex ${
          inScene && railOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: dark ? 'rgba(5,7,11,.92)' : 'rgba(244,241,236,.94)',
          borderColor: dark ? 'rgba(255,255,255,.16)' : 'rgba(23,21,18,.15)',
          color: dark ? '#f1ede3' : '#171512',
        }}
      >
        <button
          type="button"
          onClick={() => setRailOpen(false)}
          aria-label="收起导航栏"
          className="flex h-10 w-10 items-center justify-center border border-current/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="mt-3 h-px w-7 bg-current opacity-20" />
        <nav className="mt-4 flex flex-1 flex-col gap-1.5">
          {visibleModules.map((module) => {
            const Icon = module.icon
            const active =
              module.column !== undefined ? view === 'archive' && module.column === activeColumn : view === module.view
            return (
              <button
                key={module.key}
                type="button"
                title={module.label}
                aria-label={module.label}
                onClick={() => {
                  if (module.column !== undefined) void goToColumn(module.column)
                  else if (module.view) {
                    if (module.view === 'forum' && !visited.has('forum')) setRailOpen(false)
                    openView(module.view)
                  }
                }}
                className="flex h-11 w-10 flex-col items-center justify-center gap-0.5 border transition-all"
                style={{
                  borderColor: active ? currentTheme.colors[1] : 'transparent',
                  color: active ? currentTheme.colors[1] : undefined,
                  backgroundColor: active ? `${currentTheme.colors[1]}18` : undefined,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-mono text-[7px]">{module.label}</span>
              </button>
            )
          })}
        </nav>
        <Link
          to="/"
          className="mt-3 border px-1.5 py-1 text-center font-mono text-[7px] font-bold tracking-[0.12em] opacity-100 shadow-[0_0_12px_rgb(0_0_0/0.25)] transition-colors hover:brightness-110"
          style={{
            backgroundColor: dark ? '#f1ede3' : '#171512',
            borderColor: dark ? '#f1ede3' : '#171512',
            color: dark ? '#171512' : '#f1ede3',
          }}
          title="切换回 HOME 系统"
        >
          HOME<br />SYSTEM
        </Link>
      </aside>

      {inScene && !railOpen && (
        <button
          type="button"
          onClick={() => setRailOpen(true)}
          aria-label="展开导航栏"
          className="absolute top-4 left-4 z-40 flex h-10 items-center gap-2 border border-current/30 bg-[#f4f1ec]/90 px-3 font-mono text-[8px] tracking-[0.16em] text-black backdrop-blur"
        >
          <ArrowRight className="h-4 w-4" /> NAV
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-rhine-line bg-rhine-abyss/95 px-1 py-1 backdrop-blur lg:hidden">
        {visibleModules.map((module) => {
          const Icon = module.icon
          const active =
            module.column !== undefined ? view === 'archive' && module.column === activeColumn : view === module.view
          return (
            <button
              key={module.key}
              type="button"
              aria-label={module.label}
              onClick={() => {
                if (module.column !== undefined) void goToColumn(module.column)
                else if (module.view) openView(module.view)
              }}
              className={`flex min-w-[56px] flex-1 flex-col items-center gap-0.5 py-1 font-mono text-[7px] ${
                active ? 'text-rhine-gold' : 'text-rhine-faint'
              }`}
            >
              <Icon className="h-4 w-4" />
              {module.label}
            </button>
          )
        })}
      </nav>
    </main>
  )
}
