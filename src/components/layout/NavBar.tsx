import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Diamond, Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { moduleLinks, navItems, site } from '../../content'
import { useActiveSection } from '../../hooks/useActiveSection'
import { useClock } from '../../hooks/useClock'
import { cx } from '../../lib/cx'
import { StatusDot } from '../ui'

/** 首页所有锚点区块 id（滚动高亮用，模块级常量避免 effect 抖动） */
const SECTION_IDS: string[] = navItems
  .map((i) => i.section)
  .filter((s): s is string => Boolean(s))

export function NavBar() {
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const active = useActiveSection(SECTION_IDS)
  // 用「打开菜单时的路由」派生菜单开关：路由一变自动关闭，无需在 effect 里同步 setState
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const menuOpen = menuOpenFor === pathname
  const clock = useClock(site.timezone)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const isActive = (section?: string) => onHome && section != null && section === active

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-rhine-line/70 bg-rhine-abyss/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-rhine-gold/60 bg-rhine-gold/5 transition-all duration-300 group-hover:shadow-[0_0_18px_rgb(211_178_122/0.35)]">
              <Diamond className="h-4 w-4 text-rhine-gold" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-sm font-medium tracking-[0.18em] text-rhine-ink">
                {site.title}
              </span>
              <span className="mt-1 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                {site.titleSub}
              </span>
            </span>
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className={cx(
                  'group flex flex-col items-center px-3 py-2 transition-colors duration-300',
                  isActive(item.section)
                    ? 'text-rhine-gold'
                    : 'text-rhine-dim hover:text-rhine-ink',
                )}
              >
                <span className="text-sm">{item.label}</span>
                <span
                  className={cx(
                    'font-mono text-[9px] tracking-[0.25em]',
                    isActive(item.section) ? 'text-rhine-gold/80' : 'text-rhine-faint',
                  )}
                >
                  {item.labelEn}
                </span>
              </Link>
            ))}
            <span className="mx-1 h-6 w-px bg-rhine-line/70" />
            {moduleLinks.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className={cx(
                  'px-2 font-mono text-[11px] tracking-[0.2em] whitespace-nowrap transition-colors duration-300',
                  pathname === item.href
                    ? 'text-rhine-cyan'
                    : 'text-rhine-dim hover:text-rhine-cyan',
                )}
              >
                {item.labelEn}
              </Link>
            ))}
          </nav>

          {/* 状态与时钟 */}
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 font-mono text-[11px] tracking-widest text-rhine-dim md:flex">
              <StatusDot color="green" />
              <span className="text-rhine-green">SYS.ONLINE</span>
              <span className="text-rhine-faint">|</span>
              <span>{clock}</span>
            </div>
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

      {/* 移动端全屏菜单 */}
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
              {navItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setMenuOpenFor(null)}
                    className="group flex items-baseline gap-4 border-b border-rhine-line/60 py-4"
                  >
                    <span className="font-mono text-xs text-rhine-gold">
                      0{i + 1}
                    </span>
                    <span className="text-2xl text-rhine-ink transition-colors group-hover:text-rhine-gold">
                      {item.label}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.3em] text-rhine-faint">
                      {item.labelEn}
                    </span>
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-8 flex flex-wrap gap-4"
              >
                {moduleLinks.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => setMenuOpenFor(null)}
                    className="border border-rhine-line px-3 py-2 font-mono text-[11px] tracking-[0.2em] text-rhine-cyan transition-colors hover:border-rhine-cyan"
                  >
                    {item.labelEn} · {item.label}
                  </Link>
                ))}
              </motion.div>
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
