import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ExternalLink, X } from 'lucide-react'
import type { SlotModule } from '../../content/slots'
import { cx } from '../../lib/cx'
import { Tag } from '../ui/Tag'

/** 与网格 gap-4 对应的间距（px） */
const GAP = 16
/**
 * 行分组容差（px）：必须大于卡片 hover 位移（2px），
 * 否则鼠标悬停的卡片会被误判成单独一行，导致面板起点算错。
 */
const ROW_TOLERANCE = 6
/** 展开面板的最小高度（px） */
const PANEL_MIN_HEIGHT = 340
/** 展开 / 收回时长（ms），与 CSS 过渡保持一致 */
const OPEN_MS = 520
const CLOSE_MS = 380

type Phase = 'idle' | 'opening' | 'open' | 'closing'

interface PanelBox {
  top: number
  left: number
  width: number
  height: number
}

/** 相对面板的裁剪矩形（px） */
interface SeedInset {
  top: number
  right: number
  bottom: number
  left: number
}

interface Measured {
  panel: PanelBox
  seed: SeedInset
  /** 面板下方需要额外撑开的网格高度（让面板有足够空间） */
  pad: number
}

/**
 * 测量网格与目标卡片的位置：
 * - 第一排模块展开：面板从网格顶部开始（允许盖住第一排，包括自己）；
 * - 第二排及以下展开：面板从第二排顶部开始，不遮挡第一排；
 * - 起始裁剪矩形 = 目标卡片与面板区域的交集（完全在面板上方的卡片投影成细条）。
 */
function measureSlots(grid: HTMLElement, target: HTMLElement): Measured | null {
  const cardEls = Array.from(
    grid.querySelectorAll<HTMLElement>('[data-slot-card]'),
  )
  if (cardEls.length === 0) return null

  const gRect = grid.getBoundingClientRect()
  const rects = cardEls
    .map((el) => {
      const r = el.getBoundingClientRect()
      return {
        top: r.top - gRect.top,
        left: r.left - gRect.left,
        right: r.right - gRect.left,
        bottom: r.bottom - gRect.top,
      }
    })
    // 防御：忽略不可见（零尺寸）元素，避免污染行计算
    .filter((r) => r.bottom - r.top > 0 && r.right - r.left > 0)

  if (rects.length === 0) return null

  // 行分组（容差 ROW_TOLERANCE，兼容 hover 位移与亚像素布局）
  const rowTops: number[] = []
  for (const r of rects) {
    if (!rowTops.some((t) => Math.abs(t - r.top) < ROW_TOLERANCE)) {
      rowTops.push(r.top)
    }
  }
  rowTops.sort((a, b) => a - b)
  const rowOneBottom = Math.max(
    ...rects
      .filter((r) => Math.abs(r.top - rowTops[0]) < ROW_TOLERANCE)
      .map((r) => r.bottom),
  )
  const contentBottom = Math.max(...rects.map((r) => r.bottom))

  const tr = target.getBoundingClientRect()
  const cardTop = tr.top - gRect.top
  const cardBottom = tr.bottom - gRect.top
  const targetRow = rowTops.findIndex(
    (t) => Math.abs(t - cardTop) < ROW_TOLERANCE,
  )

  // 第一排展开 → 面板从网格顶部开始；其余行 → 从第二排顶部开始
  const panelTop =
    targetRow <= 0 ? 0 : rowTops.length > 1 ? rowTops[1] : rowOneBottom + GAP

  const naturalPanel = Math.max(0, contentBottom - panelTop)
  const panelHeight = Math.max(naturalPanel, PANEL_MIN_HEIGHT)
  const pad = panelHeight - naturalPanel
  const panel: PanelBox = {
    top: panelTop,
    left: 0,
    width: gRect.width,
    height: panelHeight,
  }

  const panelBottom = panelTop + panelHeight
  const seedTop =
    Math.min(Math.max(cardTop, panelTop), panelBottom - 2) - panelTop
  const seedBottom =
    panelBottom - Math.min(Math.max(cardBottom, panelTop + 2), panelBottom)
  const seedLeft = Math.min(Math.max(tr.left - gRect.left, 0), gRect.width)
  const seedRight =
    gRect.width -
    Math.min(Math.max(tr.right - gRect.left, seedLeft + 2), gRect.width)

  return {
    panel,
    seed: { top: seedTop, right: seedRight, bottom: seedBottom, left: seedLeft },
    pad,
  }
}

export interface SlotGridProps {
  slots: SlotModule[]
}

/**
 * 可展开的槽位模块网格：
 * - 第一排模块展开：面板从网格顶部开始（会盖住第一排，包括自己）；
 * - 第二排及以后展开：面板从第二排顶部开始，不遮挡第一排；
 * - 点击模块 → 面板从模块自身位置朝网格中心方向展开；再次点击 / ✕ / ESC / 点击面板外空白收回；
 * - 已展开时点击可见的其他模块：先收回当前面板，再展开目标模块；
 * - 增设槽位后行数变化，展开方向与面板尺寸自动适配。
 */
export function SlotGrid({ slots }: SlotGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  const reduce = useReducedMotion()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [revealed, setRevealed] = useState(false)
  const [panel, setPanel] = useState<PanelBox | null>(null)
  const [seed, setSeed] = useState<SeedInset | null>(null)
  const [stagePad, setStagePad] = useState(0)

  // 动画流程统一走 ref，避免定时器回调读到旧的 state 闭包
  const activeRef = useRef<string | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const pendingRef = useRef<string | null>(null)
  const busyRef = useRef(false)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  /** 展开过渡是否已经真正开始（用于判断中断收回时是否需要反向过渡） */
  const revealStartedRef = useRef(false)

  const clearTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const measure = (id: string): Measured | null => {
    const grid = gridRef.current
    const card = cardRefs.current.get(id)
    if (!grid || !card) return null
    return measureSlots(grid, card)
  }

  const finishOpen = () => {
    clearTimers()
    phaseRef.current = 'open'
    setPhase('open')
    busyRef.current = false
    drain()
  }

  const openPanel = (id: string) => {
    const m = measure(id)
    if (!m) return
    busyRef.current = true
    pendingRef.current = null
    activeRef.current = id
    setActiveId(id)
    setPanel(m.panel)
    setSeed(m.seed)
    setStagePad(m.pad)
    phaseRef.current = 'opening'
    setPhase('opening')
    setRevealed(false)
    revealStartedRef.current = false

    const reveal = () => {
      // 展开已被中断（展开中触发了收回）→ 不再继续播放展开动画
      if (phaseRef.current !== 'opening') return
      revealStartedRef.current = true
      setRevealed(true)
      if (reduce) finishOpen()
      else openTimerRef.current = window.setTimeout(finishOpen, OPEN_MS)
    }
    // 双 rAF：先让「起始裁剪」渲染出来，再触发 CSS 过渡
    requestAnimationFrame(() => requestAnimationFrame(reveal))
  }

  const finishClose = () => {
    clearTimers()
    activeRef.current = null
    setActiveId(null)
    phaseRef.current = 'idle'
    setPhase('idle')
    setPanel(null)
    setSeed(null)
    setStagePad(0)
    revealStartedRef.current = false
    busyRef.current = false
    drain()
  }

  /**
   * 开始收回：允许从 opening / open 状态发起。
   * - 展开中被打断时：取消展开定时器，CSS 以「当前裁剪进度」为起点直接反向过渡，
   *   不再把剩余展开动画播完；
   * - 若展开过渡尚未开始（起始裁剪还没变化），则无需过渡，直接收尾。
   */
  const beginClose = () => {
    const p = phaseRef.current
    if (p === 'idle' || p === 'closing') return
    clearTimers()
    busyRef.current = true
    phaseRef.current = 'closing'
    setPhase('closing')
    setRevealed(false)
    if (reduce || !revealStartedRef.current) finishClose()
    else closeTimerRef.current = window.setTimeout(finishClose, CLOSE_MS)
  }

  /** 处理待处理的点击：已展开的面板先收回，再展开目标模块 */
  const drain = () => {
    if (busyRef.current) return
    const next = pendingRef.current
    if (next == null) return
    pendingRef.current = null

    if (phaseRef.current === 'idle') {
      openPanel(next)
      return
    }
    if (next === activeRef.current) {
      beginClose()
      return
    }
    pendingRef.current = next
    beginClose()
  }

  const handleSlotClick = (id: string) => {
    const p = phaseRef.current
    if (p === 'idle') {
      openPanel(id)
      return
    }
    // 收回过程中忽略点击，避免把「收回」打断成「重新展开」
    if (p === 'closing') return
    // 再次点击当前模块 / 展开中点击当前模块 → 从当前进度收回
    if (id === activeRef.current) {
      beginClose()
      return
    }
    // 切换：先收回当前面板，收回完成后再展开目标模块
    pendingRef.current = id
    beginClose()
  }

  // 展开期间窗口尺寸变化：实时修正面板与起始裁剪
  useEffect(() => {
    if (!activeId) return undefined
    const onResize = () => {
      const grid = gridRef.current
      const card = cardRefs.current.get(activeId)
      if (!grid || !card) return
      const m = measureSlots(grid, card)
      if (!m) return
      setPanel(m.panel)
      setSeed(m.seed)
      setStagePad(m.pad)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeId])

  // ESC 收回（复用卡片点击入口：展开中同样会从当前进度反向收回）
  useEffect(() => {
    if (!activeId) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const id = activeRef.current
      if (id != null) cardRefs.current.get(id)?.click()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId])

  // 点击面板外的空白处收回（展开中同样立即从当前进度反向收回）
  useEffect(() => {
    if (!activeId) return undefined
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node | null
      if (!node) return
      if (panelRef.current?.contains(node)) return
      const el = node instanceof HTMLElement ? node : node.parentElement
      if (el?.closest('[data-slot-card]')) return
      const id = activeRef.current
      if (id != null) cardRefs.current.get(id)?.click()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [activeId])

  // 卸载时清理定时器
  useEffect(
    () => () => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current)
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

  const activeSlot = slots.find((s) => s.id === activeId) ?? null
  const panelAlive = activeSlot !== null && panel !== null && seed !== null

  return (
    <div
      ref={gridRef}
      className="relative grid gap-4 transition-[padding] duration-500 ease-out sm:grid-cols-2"
      style={{ paddingBottom: stagePad }}
    >
      {slots.map((slot, i) => {
        const isActive = activeId === slot.id
        const dimmed = phase !== 'idle' && !isActive
        return (
          <button
            key={slot.id}
            type="button"
            ref={(el) => {
              if (el) cardRefs.current.set(slot.id, el)
              else cardRefs.current.delete(slot.id)
            }}
            data-slot-card
            aria-expanded={isActive}
            aria-label={`展开模块：${slot.label}`}
            onClick={() => handleSlotClick(slot.id)}
            className={cx(
              'group relative flex min-h-[132px] select-none flex-col items-start gap-2 border p-4 text-left transition-all duration-300',
              isActive
                ? 'z-10 border-rhine-gold/60 bg-rhine-gold/[0.06] shadow-[0_0_26px_rgb(211_178_122/0.14)]'
                : 'border-rhine-line bg-rhine-panel/60 hover:-translate-y-0.5 hover:border-rhine-gold/50 hover:shadow-[0_10px_30px_rgb(0_0_0/0.4)]',
              dimmed && 'opacity-40 saturate-50',
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-[0.25em] text-rhine-gold">
                SLOT {String(i + 1).padStart(2, '0')}
              </span>
              <ChevronDown
                className={cx(
                  'h-3.5 w-3.5 text-rhine-faint transition-transform duration-300',
                  isActive && 'rotate-180 text-rhine-gold',
                )}
              />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-sm text-rhine-ink">{slot.label}</span>
              {slot.labelEn && (
                <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                  {slot.labelEn}
                </span>
              )}
            </span>
            {slot.summary && (
              <span className="mt-auto line-clamp-2 text-xs leading-relaxed text-rhine-dim">
                {slot.summary}
              </span>
            )}
          </button>
        )
      })}

      {/* 展开面板：裁剪动画的起点由目标卡片决定，方向随行列自动变化 */}
      {panelAlive && activeSlot && panel && seed && (
        <div
          key={activeSlot.id}
          ref={panelRef}
          role="region"
          aria-label={`${activeSlot.label} 模块详情`}
          tabIndex={-1}
          style={{
            top: panel.top,
            left: panel.left,
            width: panel.width,
            height: panel.height,
            clipPath: revealed
              ? 'inset(0px 0px 0px 0px)'
              : `inset(${seed.top}px ${seed.right}px ${seed.bottom}px ${seed.left}px)`,
            transition: `clip-path ${phase === 'closing' ? CLOSE_MS : OPEN_MS}ms ${
              phase === 'closing'
                ? 'cubic-bezier(0.7, 0, 0.84, 0)'
                : 'cubic-bezier(0.16, 1, 0.3, 1)'
            }`,
            willChange: 'clip-path',
          }}
          className="absolute z-20 flex flex-col overflow-hidden border border-rhine-gold/50 bg-rhine-panel/95 shadow-[0_24px_80px_rgb(0_0_0/0.55)] backdrop-blur-md"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 scanlines opacity-20"
          />
          <header className="relative flex items-start justify-between gap-3 border-b border-rhine-line/70 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.25em] text-rhine-gold">
                MODULE // {activeSlot.labelEn ?? 'SLOT'}
              </p>
              <h3 className="mt-1 truncate text-base font-medium text-rhine-ink">
                {activeSlot.label}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleSlotClick(activeSlot.id)}
              aria-label="收回模块"
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-rhine-line text-rhine-dim transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.16 }}
            className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
          >
            {activeSlot.content ? (
              <>
                {activeSlot.content.paragraphs?.map((text, i) => (
                  <p
                    key={i}
                    className="mb-3 text-sm leading-relaxed text-rhine-dim last:mb-0"
                  >
                    {text}
                  </p>
                ))}
                {activeSlot.content.items &&
                  activeSlot.content.items.length > 0 && (
                    <dl className="mt-4 space-y-3">
                      {activeSlot.content.items.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-baseline gap-3"
                        >
                          <dt className="w-20 shrink-0 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                            {item.label}
                          </dt>
                          <span
                            aria-hidden
                            className="h-px flex-1 translate-y-[-3px] border-b border-dotted border-rhine-line/60"
                          />
                          <dd className="font-mono text-xs text-rhine-ink">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                {activeSlot.content.tags &&
                  activeSlot.content.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeSlot.content.tags.map((t) => (
                        <Tag key={t} tone="cyan">
                          {t}
                        </Tag>
                      ))}
                    </div>
                  )}
                {activeSlot.content.link && (
                  <a
                    href={activeSlot.content.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 border border-rhine-gold/50 bg-rhine-gold/5 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/15"
                  >
                    {activeSlot.content.link.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {activeSlot.content.custom}
              </>
            ) : (
              <p className="font-mono text-xs leading-relaxed tracking-wider text-rhine-faint">
                CONTENT EMPTY — 在 src/content/slots.ts 中为「{activeSlot.label}
                」补充隐藏内容
              </p>
            )}
          </motion.div>

          <footer className="relative flex items-center justify-between gap-2 border-t border-rhine-line/70 px-4 py-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint sm:px-5">
            <span>ESC / ✕ / 空白处收回</span>
            <span>切换模块：先收回，再展开</span>
          </footer>
        </div>
      )}
    </div>
  )
}
