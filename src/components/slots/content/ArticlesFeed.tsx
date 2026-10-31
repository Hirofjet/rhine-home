import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  contentApi,
  resolveMediaUrl,
  type ContentArticle,
} from '../../../lib/api'
import { ArticleBlock } from './ArticleBlock'

interface ArticlesFeedProps {
  /** 后端不可用 / 没有文章时显示的内容（保留本地静态示例） */
  fallback?: ReactNode
}

/**
 * 文章列表：从后台接口读取，后台新增文章后无需重新构建即可展示；
 * 接口不可用时回退到 fallback（本地静态文章）。
 */
export function ArticlesFeed({ fallback }: ArticlesFeedProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading')
  const [articles, setArticles] = useState<ContentArticle[]>([])

  useEffect(() => {
    let alive = true
    contentApi
      .articles()
      .then((list) => {
        if (!alive) return
        setArticles(list)
        setState('ready')
      })
      .catch(() => {
        if (alive) setState('offline')
      })
    return () => {
      alive = false
    }
  }, [])

  if (state === 'loading') {
    return (
      <p className="animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
        LOADING ARTICLES …
      </p>
    )
  }

  if (state === 'offline' || articles.length === 0) {
    return <>{fallback}</>
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <ArticleBlock
          key={article.id}
          content={article.markdown}
          title={article.title}
          date={article.date ?? undefined}
          tags={article.tags}
          downloads={article.downloads?.map((item) => ({
            ...item,
            file: resolveMediaUrl(item.file),
          }))}
        />
      ))}
    </div>
  )
}
