/* ============================================================
   日志页内容 —— 每篇日志就是一个可展开 / 收回的模块
   ------------------------------------------------------------
   新增日志（不需要改这里的代码）：
   1. 在 src/assets/logs/ 下新建 markdown 文件，文件名以日期开头，
      例如 2026-11-01-rainy-day.md（日期用于排序与显示）；
   2. 文件第一行用「# 标题」写日志名，会作为模块标题；
   3. 保存后自动生成模块，并按日期从新到旧排列。
   ============================================================ */

import { ArticleBlock } from '../components/slots/content/ArticleBlock'
import type { SlotModule } from './slots'

const LOG_FILES = import.meta.glob('/src/assets/logs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 从文件名解析日期（2026-10-31-xxx.md → 2026-10-31） */
function logDate(path: string): string | null {
  const name = path.split('/').pop() ?? ''
  return /(\d{4}-\d{2}-\d{2})/.exec(name)?.[1] ?? null
}

/** 从 markdown 第一个一级标题取日志名 */
function logTitle(raw: string, fallback: string): string {
  const match = /^#\s+(.+?)\s*$/m.exec(raw)
  return match?.[1]?.trim() || fallback
}

/** 取第一段正文作为卡片摘要 */
function logSummary(raw: string): string {
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    if (/^(#{1,6}\s|>|\||```|!\[)/.test(text)) continue
    return text.replace(/[*`_~[\]()]/g, '').slice(0, 64)
  }
  return '点击展开阅读'
}

/** 按文件名（日期）倒序：最新的日志排在最前面 */
export const logSlots: SlotModule[] = Object.entries(LOG_FILES)
  .sort(([a], [b]) => (a < b ? 1 : -1))
  .map(([path, raw]) => {
    const name = path.split('/').pop() ?? path
    const date = logDate(path)
    const title = logTitle(raw, name.replace(/\.md$/, ''))
    return {
      id: path,
      label: title,
      labelEn: date ? `LOG · ${date}` : 'LOG',
      summary: logSummary(raw),
      content: {
        custom: (
          <ArticleBlock
            file={path}
            title={title}
            date={date ?? undefined}
            tags={['日志']}
            hideHeader
          />
        ),
      },
    } satisfies SlotModule
  })
