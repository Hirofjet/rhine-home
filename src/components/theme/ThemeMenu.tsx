import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Palette } from 'lucide-react'
import { cx } from '../../lib/cx'
import { THEMES, useTheme } from './ThemeProvider'

/** 主题切换器：桌面从右上角展开，手机显示为贴边面板 */
export function ThemeMenu({ compact = false }: { compact?: boolean }) {
  const { theme, definition, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`切换主题，当前为${definition.label}`}
        aria-expanded={open}
        className={cx(
          'group relative flex h-9 items-center gap-2 border border-rhine-line px-2.5 text-rhine-dim transition-all duration-300 hover:border-rhine-gold/60 hover:text-rhine-gold',
          open && 'border-rhine-gold/60 text-rhine-gold',
        )}
      >
        <Palette className="h-4 w-4" />
        <span
          aria-hidden
          className="hidden h-1.5 w-1.5 rounded-full transition-transform duration-300 group-hover:scale-125 sm:block"
          style={{ backgroundColor: definition.colors[1] }}
        />
        {!compact && (
          <span className="hidden whitespace-nowrap font-mono text-[9px] tracking-[0.16em] xl:inline">
            {definition.labelEn}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-x-3 top-16 z-50 w-auto border border-rhine-line bg-rhine-panel/95 p-2 shadow-[0_20px_50px_rgb(0_0_0/0.45)] backdrop-blur-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64"
          >
            <p className="px-2 pb-2 pt-1 font-mono text-[8px] tracking-[0.28em] text-rhine-faint">
              VISUAL PROTOCOL // 主题
            </p>
            <div className="space-y-1">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTheme(item.id)
                    setOpen(false)
                  }}
                  className={cx(
                    'group/theme flex w-full items-center gap-3 border px-2.5 py-2 text-left transition-colors',
                    theme === item.id
                      ? 'border-rhine-gold/50 bg-rhine-gold/[0.06]'
                      : 'border-transparent hover:border-rhine-line hover:bg-rhine-abyss/50',
                  )}
                >
                  <span
                    aria-hidden
                    className="relative flex h-8 w-8 shrink-0 overflow-hidden border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${item.colors[0]} 0%, ${item.colors[1]} 58%, ${item.colors[2]} 100%)`,
                    }}
                  >
                    <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.25),transparent)]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs text-rhine-ink">
                      {item.label}
                      <span className="font-mono text-[8px] tracking-[0.14em] text-rhine-faint">
                        {item.labelEn}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[8px] tracking-wider text-rhine-faint">
                      {item.description}
                    </span>
                  </span>
                  {theme === item.id && <Check className="h-3.5 w-3.5 text-rhine-gold" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
