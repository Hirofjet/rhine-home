import { motion } from 'framer-motion'
import { cx } from '../../lib/cx'

type BarColor = 'gold' | 'cyan' | 'green'

interface ProgressBarProps {
  /** 0-100 */
  value: number
  color?: BarColor
  className?: string
}

const GRADIENTS: Record<BarColor, string> = {
  gold: 'from-rhine-gold-deep via-rhine-gold to-[#f2dfb3]',
  cyan: 'from-rhine-cyan/60 via-rhine-cyan to-[#c9f4f7]',
  green: 'from-rhine-green/60 via-rhine-green to-[#d6f8e4]',
}

/** 带刻度线的进度条（进入视口时动画填充） */
export function ProgressBar({ value, color = 'gold', className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      className={cx(
        'relative h-1.5 w-full overflow-hidden border border-rhine-line/80 bg-rhine-abyss-2',
        className,
      )}
    >
      <motion.div
        className={cx('h-full bg-gradient-to-r', GRADIENTS[color])}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />
      <span aria-hidden className="absolute inset-y-0 left-1/4 w-px bg-rhine-line/60" />
      <span aria-hidden className="absolute inset-y-0 left-2/4 w-px bg-rhine-line/60" />
      <span aria-hidden className="absolute inset-y-0 left-3/4 w-px bg-rhine-line/60" />
    </div>
  )
}
