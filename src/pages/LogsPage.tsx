import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { SlotGrid } from '../components/slots/SlotGrid'
import { ArticleBlock } from '../components/slots/content/ArticleBlock'
import { GlowButton, SectionTitle } from '../components/ui'
import { logSlots } from '../content/logs'
import type { SlotModule } from '../content/slots'
import { contentApi, type ContentLog } from '../lib/api'

/** 取 markdown 第一段正文作为卡片摘要 */
function summaryOf(markdown: string): string {
  for (const line of markdown.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    if (/^(#{1,6}\s|>|\||```|!\[)/.test(text)) continue
    return text.replace(/[*`_~[\]()]/g, '').slice(0, 64)
  }
  return '点击展开阅读'
}

/** 后台日志 → 槽位模块（每篇日志一个可展开模块） */
function logsToSlots(logs: ContentLog[]): SlotModule[] {
  return logs.map((log) => ({
    id: `server-log-${log.id}`,
    label: log.title,
    labelEn: log.date ? `LOG · ${log.date}` : 'LOG',
    summary: summaryOf(log.markdown),
    content: {
      custom: (
        <ArticleBlock
          content={log.markdown}
          title={log.title}
          date={log.date ?? undefined}
          tags={['日志']}
          hideHeader
        />
      ),
    },
  }))
}

/**
 * 日志页：优先展示后台新增的日志（无需重新构建），
 * 接口不可用时回退到 src/assets/logs/ 下的本地 markdown。
 */
export function LogsPage() {
  const [serverLogs, setServerLogs] = useState<ContentLog[] | null>(null)

  useEffect(() => {
    let alive = true
    contentApi
      .logs()
      .then((list) => {
        if (alive) setServerLogs(list)
      })
      .catch(() => {
        if (alive) setServerLogs([])
      })
    return () => {
      alive = false
    }
  }, [])

  const slots =
    serverLogs && serverLogs.length > 0 ? logsToSlots(serverLogs) : logSlots
  const loading = serverLogs === null

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle index="LOG" en="JOURNAL" zh="日志" className="flex-1" />
        <span className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
          TOTAL: {loading ? '--' : String(slots.length).padStart(2, '0')}
        </span>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
            LOADING LOGS …
          </p>
        ) : (
          <SlotGrid slots={slots} />
        )}
      </div>

      <div className="mt-10 flex justify-center">
        <GlowButton to="/" variant="ghost">
          <ArrowLeft className="h-3.5 w-3.5" /> 返回首页 RETURN
        </GlowButton>
      </div>
    </main>
  )
}
