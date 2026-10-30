import { motion } from 'framer-motion'
import { ArrowLeft, Construction } from 'lucide-react'
import type { SlotModule } from '../../content/slots'
import { fadeUp, viewportOnce } from '../../lib/motion'
import { SlotGrid } from '../slots/SlotGrid'
import { GlowButton, Panel, SectionTitle } from '../ui'

interface ModulePlaceholderProps {
  /** 模块编号，如 RL-EXT-01 */
  code: string
  /** 英文标题 */
  titleEn: string
  /** 中文标题 */
  titleZh: string
  /** 模块说明（介绍未来会放什么内容） */
  description: string
  /** 槽位模块（数据在 src/content/slots.tsx 中维护） */
  slots?: SlotModule[]
}

/**
 * 扩展模块占位页：所有「待建设」的独立页面统一用这个模板，
 * 未来往里面填真实内容时，直接替换对应页面文件即可。
 */
export function ModulePlaceholder({
  code,
  titleEn,
  titleZh,
  description,
  slots = [],
}: ModulePlaceholderProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">
      <SectionTitle index={code} en={titleEn} zh={titleZh} />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-10"
      >
        <Panel code={code} title="UNDER CONSTRUCTION" titleZh="模块建设中" accent="cyan">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-rhine-cyan/40 bg-rhine-cyan/5 text-rhine-cyan">
              <Construction className="h-5 w-5 animate-pulse-soft" />
            </span>
            <p className="text-sm leading-relaxed text-rhine-dim">{description}</p>
          </div>
        </Panel>
      </motion.div>

      {/* 槽位模块 */}
      {slots.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-8"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.3em] text-rhine-faint">
              MODULE SLOTS // 模块槽位
            </p>
            <span className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
              SLOTS: {String(slots.length).padStart(2, '0')}
            </span>
          </div>

          <SlotGrid slots={slots} />
        </motion.div>
      )}

      <div className="mt-10 flex justify-center">
        <GlowButton to="/" variant="ghost">
          <ArrowLeft className="h-3.5 w-3.5" /> 返回首页 RETURN
        </GlowButton>
      </div>
    </main>
  )
}
