import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Diamond } from 'lucide-react'
import { site } from '../../content'

interface BootScreenProps {
  onFinished: () => void
}

type BootLine = { text: string; tone: 'sys' | 'cmd' | 'ok' }

const BOOT_LINES: BootLine[] = [
  { text: 'RHINE LAB PERSONAL TERMINAL v3.1.7', tone: 'sys' },
  { text: 'INITIALIZING INTERFACE ... OK', tone: 'cmd' },
  { text: `LOADING OPERATOR FILE ${site.operatorId} ... OK`, tone: 'cmd' },
  { text: 'CONNECTING TO ARCHIVE SERVER ... OK', tone: 'cmd' },
  { text: 'VERIFYING PERMISSIONS ... VISITOR ACCESS', tone: 'cmd' },
  { text: 'RENDERING MODULES ...', tone: 'cmd' },
  { text: 'SYSTEM ONLINE — ACCESS GRANTED', tone: 'ok' },
]

/** 开机终端动画：逐行打印 + 进度条，点击任意位置跳过（同会话内只播放一次） */
export function BootScreen({ onFinished }: BootScreenProps) {
  const [lineCount, setLineCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const finishedRef = useRef(false)

  const finish = useCallback(() => {
    if (!finishedRef.current) {
      finishedRef.current = true
      onFinished()
    }
  }, [onFinished])

  // 逐行打印
  useEffect(() => {
    if (lineCount >= BOOT_LINES.length) return undefined
    const t = setTimeout(
      () => setLineCount((c) => c + 1),
      lineCount === 0 ? 380 : 430,
    )
    return () => clearTimeout(t)
  }, [lineCount])

  // 进度条：全部行打印完之前封顶 90，之后冲到 100
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        const cap = lineCount >= BOOT_LINES.length ? 100 : 90
        return Math.min(cap, p + 2 + Math.random() * 4)
      })
    }, 80)
    return () => clearInterval(t)
  }, [lineCount])

  // 完成 → 通知外部
  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(finish, 520)
      return () => clearTimeout(t)
    }
    return undefined
  }, [progress, finish])

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-rhine-abyss"
      onClick={finish}
      exit={{ opacity: 0, filter: 'blur(6px)' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      role="presentation"
    >
      {/* 背景纹理 */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute inset-0 scanlines opacity-30" />

      <div className="relative w-full max-w-lg px-6" onClick={(e) => e.stopPropagation()}>
        {/* 徽记 */}
        <div className="mb-8 flex items-center gap-4">
          <motion.span
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex h-12 w-12 items-center justify-center border border-rhine-gold/70 bg-rhine-gold/5 shadow-[0_0_28px_rgb(211_178_122/0.25)]"
          >
            <Diamond className="h-5 w-5 text-rhine-gold" />
          </motion.span>
          <div>
            <p className="font-display text-lg font-medium tracking-[0.25em] text-rhine-ink">
              {site.title}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.35em] text-rhine-dim">
              {site.titleSub} · v3.1.7
            </p>
          </div>
        </div>

        {/* 终端输出 */}
        <div className="border border-rhine-line bg-rhine-abyss-2/90 p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rhine-red/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-rhine-gold/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-rhine-green/70" />
            <span className="ml-2 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
              TERMINAL // BOOT SEQUENCE
            </span>
          </div>
          <div className="min-h-[176px] space-y-1.5 font-mono text-xs leading-relaxed">
            {BOOT_LINES.slice(0, lineCount).map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className={
                  line.tone === 'ok'
                    ? 'text-glow-cyan text-rhine-green'
                    : line.tone === 'sys'
                      ? 'text-rhine-gold'
                      : 'text-rhine-dim'
                }
              >
                {line.tone === 'cmd' && (
                  <span className="mr-2 text-rhine-cyan">&gt;</span>
                )}
                {line.text}
              </motion.p>
            ))}
            {lineCount < BOOT_LINES.length && (
              <span className="inline-block h-3.5 w-2 animate-blink bg-rhine-cyan align-middle" />
            )}
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.25em]">
            <span className="text-rhine-faint">
              LOADING MODULES · {site.operatorId}
            </span>
            <span className="text-rhine-gold">{Math.floor(progress)}%</span>
          </div>
          <div className="relative h-1 overflow-hidden border border-rhine-line/80 bg-rhine-abyss-2">
            <div
              className="h-full bg-gradient-to-r from-rhine-gold-deep via-rhine-gold to-[#f2dfb3] transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 animate-pulse-soft text-center font-mono text-[10px] tracking-[0.3em] text-rhine-faint">
            CLICK TO SKIP · 点击任意位置跳过
          </p>
        </div>
      </div>
    </motion.div>
  )
}
