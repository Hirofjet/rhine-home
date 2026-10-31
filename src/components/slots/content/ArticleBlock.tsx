import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileDown, FileText, Paperclip } from 'lucide-react'
import { cx } from '../../../lib/cx'
import { Tag } from '../../ui/Tag'

/** 自动收集 src/assets 下的所有 markdown 文件（文章与日志通用） */
const ARTICLE_FILES = import.meta.glob('/src/assets/**/*.md', {
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

/** 文章底部附件条目 */
export interface ArticleDownload {
  /** 链接文字，例如「本文 PDF 版」 */
  label: string
  /**
   * 文件路径：只写文件名时默认从 public/downloads/ 取（如 'paper.pdf'），
   * 也可写 '/downloads/paper.pdf' 完整路径或 https 外链。
   */
  file: string
  /** 文件大小文字（可选），例如 '1.2 MB' */
  size?: string
  /** 备注文字（可选） */
  note?: string
}

/** 把文件名解析为可访问的下载地址（兼容部署在子路径的情况） */
function resolveDownload(file: string): string {
  if (/^(https?:)?\/\//i.test(file) || file.startsWith('/')) return file
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}downloads/${file.replace(/^downloads\//, '')}`
}

export interface ArticleBlockProps {
  /**
   * markdown 文件路径（放在 src/assets/articles/ 下）：
   * 可写完整路径 '/src/assets/articles/hello.md'，也可只写文件名 'hello.md'
   */
  file?: string
  /** 直接传入 markdown 文本（后台管理发布的文章用这个，与 file 二选一） */
  content?: string
  /** 文章标题（不填则显示默认） */
  title?: string
  /** 日期文字 */
  date?: string
  /** 标签（显示在组件底部） */
  tags?: string[]
  /** 文章末尾的本地文件下载链接（文件放在 public/downloads/ 下） */
  downloads?: ArticleDownload[]
  /** 是否隐藏组件自带的标题栏（例如放在日志模块里，标题由模块头提供） */
  hideHeader?: boolean
  className?: string
}

/**
 * 文章组件：读取 markdown 文件并渲染（支持 GFM：表格 / 任务列表 / 删除线等）。
 * 一篇 markdown 对应一个组件，放在槽位的 content.custom 里即可。
 */
export function ArticleBlock({
  file,
  content,
  title,
  date,
  tags,
  downloads,
  hideHeader = false,
  className,
}: ArticleBlockProps) {
  const markdown = content ?? findArticle(file)
  return (
    <article
      className={cx(
        'overflow-hidden border border-rhine-line bg-rhine-abyss/40',
        className,
      )}
    >
      {!hideHeader && (
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
      )}

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

      {downloads && downloads.length > 0 && (
        <div className="border-t border-rhine-line/70 px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
            <Paperclip className="h-3 w-3" />
            ATTACHMENTS // 附件下载
          </p>
          <ul className="space-y-2">
            {downloads.map((item) => (
              <li key={`${item.label}-${item.file}`}>
                <a
                  href={resolveDownload(item.file)}
                  download={item.file.split('/').pop() ?? item.label}
                  rel="noreferrer"
                  className="group flex items-center gap-3 border border-rhine-line/70 bg-rhine-abyss/40 px-3 py-2 transition-colors hover:border-rhine-gold/50 hover:bg-rhine-gold/5"
                >
                  <FileDown className="h-4 w-4 shrink-0 text-rhine-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-rhine-ink">
                      {item.label}
                    </span>
                    {item.note && (
                      <span className="mt-0.5 block truncate font-mono text-[9px] tracking-wider text-rhine-faint">
                        {item.note}
                      </span>
                    )}
                  </span>
                  {item.size && (
                    <span className="shrink-0 font-mono text-[10px] text-rhine-faint">
                      {item.size}
                    </span>
                  )}
                  <Download className="h-3.5 w-3.5 shrink-0 text-rhine-faint transition-colors group-hover:text-rhine-gold" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

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
