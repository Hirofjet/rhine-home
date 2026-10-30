import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'

type GlowVariant = 'gold' | 'cyan' | 'ghost'

interface GlowButtonProps {
  children: ReactNode
  /** 站内路由 */
  to?: string
  /** 外链或页内锚点（#xxx） */
  href?: string
  onClick?: () => void
  variant?: GlowVariant
  className?: string
}

const VARIANTS: Record<GlowVariant, string> = {
  gold: 'border-rhine-gold/60 bg-rhine-gold/10 text-rhine-gold hover:border-rhine-gold hover:bg-rhine-gold/20 hover:shadow-[0_0_28px_rgb(211_178_122/0.35)]',
  cyan: 'border-rhine-cyan/60 bg-rhine-cyan/10 text-rhine-cyan hover:border-rhine-cyan hover:bg-rhine-cyan/20 hover:shadow-[0_0_28px_rgb(99_212_220/0.35)]',
  ghost:
    'border-rhine-line-2 text-rhine-ink hover:border-rhine-gold/70 hover:text-rhine-gold',
}

/** 莱茵风格辉光按钮：支持站内路由 / 外链 / 页内锚点 / 点击回调 */
export function GlowButton({
  children,
  to,
  href,
  onClick,
  variant = 'gold',
  className,
}: GlowButtonProps) {
  const cls = cx(
    'inline-flex cursor-pointer items-center gap-2 border px-5 py-2.5 font-ui text-xs font-semibold uppercase tracking-[0.22em] transition-all duration-300',
    VARIANTS[variant],
    className,
  )
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  if (href) {
    const external = /^(https?:|mailto:)/.test(href)
    return (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        className={cls}
      >
        {children}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
