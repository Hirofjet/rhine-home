import { cx } from '../../lib/cx'

/**
 * 论坛头衔与活跃等级徽章。
 * 没有头衔时不渲染，避免普通用户头像旁出现空占位。
 */
export function AuthorTitle({
  title,
  level,
  className,
}: {
  title?: string
  level?: number
  className?: string
}) {
  if (!title && !level) return null
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 border border-rhine-gold/40 bg-rhine-gold/[0.06] px-1.5 py-0.5 font-mono text-[8px] leading-none tracking-wider text-rhine-gold',
        className,
      )}
    >
      {title || '论坛成员'}
      {Number(level) > 0 && <span className="text-rhine-faint">LV.{level}</span>}
    </span>
  )
}
