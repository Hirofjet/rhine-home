import { cx } from '../../lib/cx'

export type DotColor = 'green' | 'gold' | 'cyan' | 'red'

const COLORS: Record<DotColor, string> = {
  green: 'bg-rhine-green',
  gold: 'bg-rhine-gold',
  cyan: 'bg-rhine-cyan',
  red: 'bg-rhine-red',
}

/** 呼吸状态灯 */
export function StatusDot({
  color = 'green',
  className,
}: {
  color?: DotColor
  className?: string
}) {
  return (
    <span className={cx('relative inline-flex h-2 w-2', className)}>
      <span
        className={cx(
          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
          COLORS[color],
        )}
      />
      <span className={cx('relative inline-flex h-2 w-2 rounded-full', COLORS[color])} />
    </span>
  )
}
