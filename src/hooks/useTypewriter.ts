import { useEffect, useState } from 'react'

/**
 * 打字机 hook：循环打字显示 words 中的词。
 * 注意：words 请传模块级常量（避免引用变化导致重启动画）。
 */
export function useTypewriter(
  words: string[],
  typingMs = 90,
  holdMs = 1800,
  eraseMs = 45,
): string {
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[index % words.length] ?? ''
    let timeout: ReturnType<typeof setTimeout>

    if (!deleting && text === word) {
      timeout = setTimeout(() => setDeleting(true), holdMs)
    } else if (deleting && text === '') {
      // 放到下一个 tick，避免在 effect 内同步 setState
      timeout = setTimeout(() => {
        setDeleting(false)
        setIndex((i) => (i + 1) % words.length)
      }, 0)
    } else {
      timeout = setTimeout(
        () => setText(word.slice(0, text.length + (deleting ? -1 : 1))),
        deleting ? eraseMs : typingMs,
      )
    }
    return () => clearTimeout(timeout)
  }, [text, deleting, index, words, typingMs, holdMs, eraseMs])

  return text
}
