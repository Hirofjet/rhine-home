import type { PointerEvent, ReactNode } from 'react'
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
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    element.style.setProperty('--glow-x', `${event.clientX - rect.left}px`)
    element.style.setProperty('--glow-y', `${event.clientY - rect.top}px`)
  }

  const cls = cx(
    'group relative isolate inline-flex cursor-pointer items-center gap-2 overflow-hidden border px-5 py-2.5 font-ui text-xs font-semibold uppercase tracking-[0.22em] transition-all duration-300',
    VARIANTS[variant],
    className,
  )

  // 跟随鼠标的柔光（内容之下，按钮底色之上）
  const glow = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{
        background:
          'radial-gradient(160px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgb(211 178 122 / 0.22), transparent 62%)',
      }}
    />
  )

  if (to) {
    return (
      <Link to={to} className={cls} onPointerMove={handlePointerMove}>
        {glow}
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
        onPointerMove={handlePointerMove}
      >
        {glow}
        {children}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      onPointerMove={handlePointerMove}
    >
      {glow}
      {children}
    </button>
  )
}
