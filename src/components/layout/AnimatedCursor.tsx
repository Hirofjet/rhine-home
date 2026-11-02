/* oxlint-disable react/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../theme/ThemeProvider'

type CursorState = 'default' | 'pointer' | 'text'

const SPRITES: Record<
  CursorState,
  { file: string; frames: number; hotspot: [number, number]; frameMs: number }
> = {
  default: { file: 'default.png', frames: 36, hotspot: [6, 10], frameMs: 48 },
  pointer: { file: 'pointer.png', frames: 36, hotspot: [6, 10], frameMs: 48 },
  text: { file: 'text.png', frames: 19, hotspot: [15, 16], frameMs: 64 },
}

const INTERACTIVE =
  'a,button,[role="button"],summary,select,label[for],input[type="checkbox"],input[type="radio"]'
const TEXT_INPUT = 'input:not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]'

/** 动态鼠标皮肤：使用 Blue Archive .ani 提取的精灵图，按主题着色。 */
export function AnimatedCursor() {
  const { theme } = useTheme()
  const [state, setState] = useState<CursorState>('default')
  const [frame, setFrame] = useState(0)
  const [visible, setVisible] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const positionRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduce) return undefined
    setEnabled(true)
    const root = document.documentElement
    root.classList.add('has-animated-cursor')

    const move = (event: PointerEvent) => {
      positionRef.current = { x: event.clientX, y: event.clientY }
      const sprite = SPRITES[state]
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${event.clientX - sprite.hotspot[0]}px, ${
          event.clientY - sprite.hotspot[1]
        }px, 0)`
      }
      setVisible(true)
    }
    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest(TEXT_INPUT)) setState('text')
      else if (target.closest(INTERACTIVE)) setState('pointer')
      else setState('default')
    }
    const leave = () => setVisible(false)
    const enter = (event: MouseEvent) => {
      positionRef.current = { x: event.clientX, y: event.clientY }
      setVisible(true)
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    document.addEventListener('mouseleave', leave)
    document.addEventListener('mouseenter', enter)
    return () => {
      root.classList.remove('has-animated-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      document.removeEventListener('mouseleave', leave)
      document.removeEventListener('mouseenter', enter)
    }
  }, [state])

  useEffect(() => {
    if (!enabled) return undefined
    setFrame(0)
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % SPRITES[state].frames)
    }, SPRITES[state].frameMs)
    return () => window.clearInterval(timer)
  }, [enabled, state])

  if (!enabled) return null
  const sprite = SPRITES[state]

  return (
    <div
      ref={cursorRef}
      aria-hidden
      data-cursor-theme={theme}
      className="animated-cursor"
      style={{
        width: 32,
        backgroundImage: `url('/cursors/animated/${sprite.file}')`,
        backgroundPosition: `-${frame * 32}px 0`,
        opacity: visible ? 1 : 0,
      }}
    />
  )
}
