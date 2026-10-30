import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

type TagTone = 'dim' | 'gold' | 'cyan'

interface TagProps {
  children: ReactNode
  tone?: TagTone
  className?: string
}

const TONES: Record<TagTone, string> = {
  dim: 'border-rhine-line text-rhine-dim',
  gold: 'border-rhine-gold/50 text-rhine-gold',
  cyan: 'border-rhine-cyan/50 text-rhine-cyan',
}

/** 小型标签 */
export function Tag({ children, tone = 'dim', className }: TagProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center border px-2 py-0.5 font-mono text-[11px] tracking-wider',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
