import { useEffect, useState } from 'react'
import { SlotGrid } from '../components/slots/SlotGrid'
import { ArticleBlock } from '../components/slots/content/ArticleBlock'
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
    labelEn: `#${String(log.id).padStart(2, '0')} · ${log.date ?? 'LOG'} · ${log.author || '示例用户'}`,
    summary: `[日志] ${summaryOf(log.markdown)}`,
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
    const load = () => {
      contentApi
        .logs()
        .then((list) => {
          if (alive) setServerLogs(list)
        })
        .catch(() => {
          if (alive) setServerLogs([])
        })
    }
    load()
    window.addEventListener('rhine:content-updated', load)
    return () => {
      alive = false
      window.removeEventListener('rhine:content-updated', load)
    }
  }, [])

  const slots =
    serverLogs && serverLogs.length > 0 ? logsToSlots(serverLogs) : logSlots
  const loading = serverLogs === null

  return (
    <main className="w-full pb-16">
      {loading ? (
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          LOADING LOGS …
        </p>
      ) : slots.length === 0 ? (
        <p className="border border-dashed border-rhine-line/70 px-4 py-8 text-center font-mono text-[10px] tracking-wider text-rhine-faint">
          暂无已发布日志
        </p>
      ) : (
        <SlotGrid slots={slots} />
      )}
    </main>
  )
}
