import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { GuestMessage } from '../../lib/api'

interface DanmakuItem {
  key: string
  name: string
  text: string
  top: number
  duration: number
  delay: number
  color: string
}

const LANES = 12
const COLORS = [
  'text-rhine-dim',
  'text-rhine-cyan/80',
  'text-rhine-gold/80',
  'text-rhine-ink/70',
]

function buildItems(messages: GuestMessage[]): DanmakuItem[] {
  if (messages.length === 0) return []
  const items: DanmakuItem[] = []
  const laneCounters = new Array<number>(LANES).fill(0)
  // 重复几轮，让屏幕更饱满
  const cycles = Math.max(1, Math.ceil(18 / messages.length))
  for (let c = 0; c < cycles; c++) {
    messages.forEach((m, i) => {
      const idx = c * messages.length + i
      const lane = idx % LANES
      const duration = 24 + (lane % 3) * 5
      const k = laneCounters[lane] ?? 0
      laneCounters[lane] = k + 1
      // 同一轨道的相邻弹幕错开「duration + 8s」，避免文字重叠
      const phaseOffset = (lane * 2.7) % duration
      items.push({
        key: `${m.id}-${c}-${i}`,
        name: m.name,
        text: m.content,
        top: 6 + lane * 7,
        duration,
        delay: -(phaseOffset + k * (duration + 8)),
        color: COLORS[idx % COLORS.length] ?? 'text-rhine-dim',
      })
    })
  }
  return items
}

/** 弹幕墙：所有留言从右向左飘过整页（无障碍偏好下改为静态列表） */
export function DanmakuWall({ messages }: { messages: GuestMessage[] }) {
  const reduce = useReducedMotion()
  const items = useMemo(() => buildItems(messages), [messages])

  if (reduce) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden p-6">
        <div className="flex flex-wrap gap-2 opacity-70">
          {messages.map((m) => (
            <span
              key={m.id}
              className="border border-rhine-line/70 bg-rhine-panel/60 px-2 py-1 font-mono text-[11px] text-rhine-dim"
            >
              <span className="text-rhine-gold">{m.name}</span>：{m.content}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <p className="font-mono text-xs tracking-[0.3em] text-rhine-faint">
          暂无留言 · 来发送第一条讯号
        </p>
      </div>
    )
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {items.map((it) => (
        <span
          key={it.key}
          className={`danmaku-item absolute left-0 whitespace-nowrap font-mono text-sm ${it.color}`}
          style={{
            top: `${it.top}%`,
            animationDuration: `${it.duration}s`,
            animationDelay: `${it.delay}s`,
          }}
        >
          <span className="text-rhine-gold">{it.name}</span>
          <span className="text-rhine-faint">：</span>
          {it.text}
        </span>
      ))}
    </div>
  )
}
