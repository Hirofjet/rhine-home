import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type PanelAccent = 'gold' | 'cyan' | 'none'

interface PanelProps {
  /** 面板编号（头部小字，如 RL-01） */
  code?: string
  /** 面板英文标题 */
  title?: string
  /** 面板中文小字 */
  titleZh?: string
  /** 角标强调色 */
  accent?: PanelAccent
  className?: string
  /** 头部右侧插槽 */
  right?: ReactNode
  children: ReactNode
}

const ACCENT: Record<PanelAccent, string> = {
  gold: 'border-rhine-gold/70',
  cyan: 'border-rhine-cyan/70',
  none: '',
}

/** 莱茵风格面板：细描边 + 四角刻度 + 编号标题栏 */
export function Panel({
  code,
  title,
  titleZh,
  accent = 'gold',
  className,
  right,
  children,
}: PanelProps) {
  const corner =
    'pointer-events-none absolute h-2.5 w-2.5 border-rhine-line-2'
  return (
    <section
      className={cx(
        'relative border border-rhine-line bg-rhine-panel/85 backdrop-blur-sm',
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(corner, 'left-0 top-0 border-l-2 border-t-2', ACCENT[accent])}
      />
      <span
        aria-hidden
        className={cx(corner, 'right-0 top-0 border-r-2 border-t-2', ACCENT[accent])}
      />
      <span
        aria-hidden
        className={cx(corner, 'bottom-0 left-0 border-b-2 border-l-2', ACCENT[accent])}
      />
      <span
        aria-hidden
        className={cx(corner, 'bottom-0 right-0 border-b-2 border-r-2', ACCENT[accent])}
      />

      {(code || title || titleZh || right) && (
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rhine-line px-4 py-2.5 sm:px-5">
          {code && (
            <span className="font-mono text-[11px] tracking-[0.2em] text-rhine-gold">
              {code}
            </span>
          )}
          {title && (
            <h3 className="font-ui text-sm font-semibold uppercase tracking-[0.22em] text-rhine-ink">
              {title}
            </h3>
          )}
          {titleZh && <span className="text-xs text-rhine-dim">{titleZh}</span>}
          <span
            aria-hidden
            className="h-px min-w-6 flex-1 bg-gradient-to-r from-rhine-line to-transparent"
          />
          {right}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
