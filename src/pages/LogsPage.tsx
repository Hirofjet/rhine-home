import { ArrowLeft } from 'lucide-react'
import { SlotGrid } from '../components/slots/SlotGrid'
import { GlowButton, SectionTitle } from '../components/ui'
import { logSlots } from '../content/logs'

/**
 * 日志页：src/assets/logs 下的每篇 markdown 自动成为一个可展开的日志模块，
 * 展开后渲染 markdown 正文，动画与档案库等页面的槽位模块一致。
 */
export function LogsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle index="LOG" en="JOURNAL" zh="日志" className="flex-1" />
        <span className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
          TOTAL: {String(logSlots.length).padStart(2, '0')}
        </span>
      </div>

      <div className="mt-8">
        <SlotGrid slots={logSlots} />
      </div>

      <div className="mt-10 flex justify-center">
        <GlowButton to="/" variant="ghost">
          <ArrowLeft className="h-3.5 w-3.5" /> 返回首页 RETURN
        </GlowButton>
      </div>
    </main>
  )
}
