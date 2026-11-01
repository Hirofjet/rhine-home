import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Diamond, Menu, UserRound, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { moduleLinks, navItems, site } from '../../content'
import { useActiveSection } from '../../hooks/useActiveSection'
import { useClock } from '../../hooks/useClock'
import { cx } from '../../lib/cx'
import { resolveMediaUrl } from '../../lib/api'
import { useSession } from '../auth/useSession'
import { StatusDot } from '../ui'

const SECTION_IDS: string[] = navItems
  .map((i) => i.section)
  .filter((s): s is string => Boolean(s))

const HOME_LINKS = navItems

export function NavBar() {
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const active = useActiveSection(SECTION_IDS)
  const clock = useClock(site.timezone)
  const { user } = useSession()
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [homeOpenFor, setHomeOpenFor] = useState<string | null>(null)
  const menuOpen = menuOpenFor === pathname
  const homeOpen = homeOpenFor === pathname
  const homeActive = onHome && HOME_LINKS.some((item) => item.section === active)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const avatar = user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : ''

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-rhine-line/70 bg-rhine-abyss/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-rhine-gold/60 bg-rhine-gold/5 transition-all duration-300 group-hover:shadow-[0_0_18px_rgb(211_178_122/0.35)]">
              <Diamond className="h-4 w-4 text-rhine-gold" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-sm font-medium tracking-[0.18em] text-rhine-ink">
                {site.title}
              </span>
              <span className="mt-1 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                {site.titleSub}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
            <div
              className="relative"
              onMouseEnter={() => setHomeOpenFor(pathname)}
              onMouseLeave={() => setHomeOpenFor(null)}
            >
              <button
                type="button"
                onClick={() => setHomeOpenFor(homeOpen ? null : pathname)}
                className={cx(
                  'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                  homeActive ? 'text-rhine-gold' : 'text-rhine-dim hover:text-rhine-ink',
                )}
              >
                首页
                <ChevronDown className={cx('h-3 w-3 transition-transform', homeOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {homeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full w-44 border border-rhine-line bg-rhine-panel/95 py-1 shadow-[0_12px_30px_rgb(0_0_0/0.45)] backdrop-blur"
                  >
                    {HOME_LINKS.map((item) => (
                      <Link
                        key={item.id}
                        to={item.href}
                        className="flex items-baseline justify-between px-3 py-2 text-xs text-rhine-dim transition-colors hover:bg-rhine-gold/5 hover:text-rhine-gold"
                      >
                        <span>{item.label}</span>
                        <span className="font-mono text-[9px] tracking-[0.18em] text-rhine-faint">
                          {item.labelEn}
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {moduleLinks.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className={cx(
                  'px-3 py-2 text-sm transition-colors',
                  pathname === item.href
                    ? 'text-rhine-cyan'
                    : 'text-rhine-dim hover:text-rhine-ink',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 font-mono text-[10px] tracking-widest text-rhine-dim md:flex">
              <StatusDot color="green" />
              <span className="text-rhine-green">SYS.ONLINE</span>
              <span className="text-rhine-faint">|</span>
              <span>{clock}</span>
            </div>

            <Link
              to="/profile"
              className="flex items-center gap-2 border border-rhine-line px-2.5 py-1.5 transition-colors hover:border-rhine-gold/60"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={user?.username ?? '头像'}
                  className="h-6 w-6 rounded-full border border-rhine-gold/40 object-cover"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-rhine-line bg-rhine-abyss text-rhine-gold">
                  {user ? (
                    <span className="font-mono text-[10px]">
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>
                  ) : (
                    <UserRound className="h-3 w-3" />
                  )}
                </span>
              )}
              <span className="hidden font-mono text-[10px] tracking-wider text-rhine-dim sm:inline">
                {user ? user.username : '登录'}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpenFor(pathname)}
              aria-label="打开菜单"
              className="flex h-9 w-9 items-center justify-center border border-rhine-line text-rhine-dim transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-rhine-abyss/95 backdrop-blur-lg lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <span className="font-display text-sm tracking-[0.18em] text-rhine-ink">
                {site.title}
              </span>
              <button
                type="button"
                onClick={() => setMenuOpenFor(null)}
                aria-label="关闭菜单"
                className="flex h-9 w-9 items-center justify-center border border-rhine-line text-rhine-dim transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col justify-center px-8 sm:px-12">
              <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-rhine-faint">首页</p>
              <div className="grid grid-cols-2 gap-2 border-b border-rhine-line/60 pb-5">
                {HOME_LINKS.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => setMenuOpenFor(null)}
                    className="flex items-baseline justify-between border border-rhine-line/60 px-3 py-2 text-sm text-rhine-ink"
                  >
                    {item.label}
                    <span className="font-mono text-[9px] text-rhine-faint">{item.labelEn}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {moduleLinks.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => setMenuOpenFor(null)}
                    className="border border-rhine-line px-3 py-3 text-sm text-rhine-ink"
                  >
                    {item.label}
                    <span className="ml-2 font-mono text-[9px] tracking-[0.16em] text-rhine-cyan">
                      {item.labelEn}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpenFor(null)}
                className="mt-5 border border-rhine-gold/50 bg-rhine-gold/5 px-3 py-3 text-center text-sm text-rhine-gold"
              >
                {user ? `我的主页 · ${user.username}` : '登录 / 注册'}
              </Link>
            </nav>

            <div className="flex items-center gap-3 px-8 pb-10 font-mono text-[11px] tracking-widest text-rhine-dim sm:px-12">
              <StatusDot color="green" />
              <span className="text-rhine-green">SYS.ONLINE</span>
              <span className="text-rhine-faint">|</span>
              <span>{clock}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
