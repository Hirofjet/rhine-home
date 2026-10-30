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

/**
 * 每条留言只生成一个弹幕元素：
 * - 动画时长 = 完整飞过一屏的时间，无限循环；
 * - 因此同一条留言只有在「上一次播完」之后才会再次出现，不会同时出现两次；
 * - 用负延迟让进入页面时各条弹幕已经分布在不同进度/轨道上。
 */
function buildItems(messages: GuestMessage[]): DanmakuItem[] {
  return messages.map((m, i) => {
    const lane = i % LANES
    const duration = 24 + (i % 4) * 4
    return {
      key: String(m.id),
      name: m.name,
      text: m.content,
      top: 6 + lane * 7,
      duration,
      delay: -((i * 3.7) % duration),
      color: COLORS[i % COLORS.length] ?? 'text-rhine-dim',
    }
  })
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
