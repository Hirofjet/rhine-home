import { useTypewriter } from '../../hooks/useTypewriter'
import { cx } from '../../lib/cx'

interface TypingTextProps {
  /** 轮流打字的词（传模块级常量） */
  words: string[]
  /** 前缀标签，如「身份认证：」 */
  label?: string
  className?: string
}

/** 打字机文本 + 闪烁光标 */
export function TypingText({ words, label, className }: TypingTextProps) {
  const text = useTypewriter(words)
  return (
    <p className={cx('font-mono text-sm text-rhine-cyan', className)}>
      {label && <span className="text-rhine-dim">{label} </span>}
      {text}
      <span
        aria-hidden
        className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-rhine-cyan"
      />
    </p>
  )
}
