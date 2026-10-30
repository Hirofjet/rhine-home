import { cx } from '../../lib/cx'

interface SectionTitleProps {
  /** 序号（两位数，如 01） */
  index: string
  /** 英文标题 */
  en: string
  /** 中文标题 */
  zh: string
  className?: string
}

/** 区块标题：[ 01 ] PERSONNEL FILE // 干员档案 */
export function SectionTitle({ index, en, zh, className }: SectionTitleProps) {
  return (
    <div className={cx('flex items-center gap-3 sm:gap-4', className)}>
      <span className="font-mono text-sm tracking-[0.3em] text-rhine-gold">
        [ {index} ]
      </span>
      <h2 className="font-display text-lg font-medium uppercase tracking-[0.22em] text-rhine-ink sm:text-2xl">
        {en}
      </h2>
      <span className="text-sm text-rhine-dim">// {zh}</span>
      <span
        aria-hidden
        className="h-px min-w-4 flex-1 bg-gradient-to-r from-rhine-line-2 via-rhine-line to-transparent"
      />
      <span
        aria-hidden
        className="hidden h-2 w-2 rotate-45 border border-rhine-gold/60 sm:block"
      />
    </div>
  )
}
