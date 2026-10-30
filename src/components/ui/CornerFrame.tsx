import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { PanelAccent } from './Panel'

interface CornerFrameProps {
  children?: ReactNode
  /** 角标尺寸（px） */
  size?: number
  accent?: PanelAccent
  className?: string
}

const ACCENT: Record<PanelAccent, string> = {
  gold: 'border-rhine-gold/80',
  cyan: 'border-rhine-cyan/80',
  none: 'border-rhine-line-2',
}

/** 独立四角刻度框（用于 Hero 徽记等自由布局） */
export function CornerFrame({
  children,
  size = 16,
  accent = 'gold',
  className,
}: CornerFrameProps) {
  const corner = 'pointer-events-none absolute border-0'
  const style = { width: size, height: size }
  return (
    <div className={cx('relative', className)}>
      <span
        aria-hidden
        style={style}
        className={cx(corner, 'left-0 top-0 border-l-2 border-t-2', ACCENT[accent])}
      />
      <span
        aria-hidden
        style={style}
        className={cx(corner, 'right-0 top-0 border-r-2 border-t-2', ACCENT[accent])}
      />
      <span
        aria-hidden
        style={style}
        className={cx(corner, 'bottom-0 left-0 border-b-2 border-l-2', ACCENT[accent])}
      />
      <span
        aria-hidden
        style={style}
        className={cx(corner, 'bottom-0 right-0 border-b-2 border-r-2', ACCENT[accent])}
      />
      {children}
    </div>
  )
}
