import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText } from 'lucide-react'
import { cx } from '../../../lib/cx'
import { Tag } from '../../ui/Tag'

/** 自动收集 src/assets/articles 下的所有 markdown 文件（?raw 读取原文） */
const ARTICLE_FILES = import.meta.glob('/src/assets/articles/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function findArticle(file?: string): string | null {
  if (!file) return null
  const target = file.replace(/^\.?\//, '')
  const key = Object.keys(ARTICLE_FILES).find(
    (k) => k === file || k === `/${target}` || k.endsWith(`/${target}`),
  )
  return key ? (ARTICLE_FILES[key] ?? null) : null
}

export interface ArticleBlockProps {
  /**
   * markdown 文件路径（放在 src/assets/articles/ 下）：
   * 可写完整路径 '/src/assets/articles/hello.md'，也可只写文件名 'hello.md'
   */
  file?: string
  /** 文章标题（不填则显示默认） */
  title?: string
  /** 日期文字 */
  date?: string
  /** 标签（显示在组件底部） */
  tags?: string[]
  className?: string
}

/**
 * 文章组件：读取 markdown 文件并渲染（支持 GFM：表格 / 任务列表 / 删除线等）。
 * 一篇 markdown 对应一个组件，放在槽位的 content.custom 里即可。
 */
export function ArticleBlock({
  file,
  title,
  date,
  tags,
  className,
}: ArticleBlockProps) {
  const markdown = findArticle(file)
  return (
    <article
      className={cx(
        'overflow-hidden border border-rhine-line bg-rhine-abyss/40',
        className,
      )}
    >
      <header className="flex items-center gap-3 border-b border-rhine-line/70 px-4 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-rhine-gold" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-rhine-ink">
            {title ?? '未命名文章'}
          </h4>
          <p className="mt-0.5 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
            {date ? `DATE // ${date}` : 'ARTICLE // MARKDOWN'}
          </p>
        </div>
      </header>

      <div className="px-4 py-3">
        {markdown ? (
          <div className="md-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        ) : file ? (
          <p className="font-mono text-xs leading-relaxed tracking-wider text-rhine-faint">
            未找到 markdown 文件：{file}
            <br />
            （文件需要放在 src/assets/articles/ 下）
          </p>
        ) : (
          <p className="font-mono text-xs leading-relaxed tracking-wider text-rhine-faint">
            待接入文章：在 file 中填写 markdown 路径，例如
            file="/src/assets/articles/hello.md"
          </p>
        )}
      </div>

      {tags && tags.length > 0 && (
        <footer className="flex flex-wrap gap-2 border-t border-rhine-line/70 px-4 py-2">
          {tags.map((t) => (
            <Tag key={t} tone="cyan">
              {t}
            </Tag>
          ))}
        </footer>
      )}
    </article>
  )
}
