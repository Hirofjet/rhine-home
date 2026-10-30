import { cx } from '../../lib/cx'

const BARS = [
  2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 1, 4, 2,
  1, 3, 2, 1, 1, 2, 1, 3, 1, 2, 1, 4, 1, 1, 2,
]

/** 装饰用条形码 */
export function Barcode({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx('flex h-5 items-stretch gap-[2px] opacity-50', className)}
    >
      {BARS.map((w, i) => (
        <span key={i} style={{ width: w }} className="bg-rhine-gold/70" />
      ))}
    </div>
  )
}
