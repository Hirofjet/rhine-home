import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  contentApi,
  resolveMediaUrl,
  type ContentVideo,
} from '../../../lib/contentApi'
import { VideoBlock } from './VideoBlock'

interface VideosFeedProps {
  /** 后端不可用 / 没有视频时显示的内容（保留本地静态示例） */
  fallback?: ReactNode
}

/** 视频列表：从后台接口读取，新增视频后无需重新构建 */
export function VideosFeed({ fallback }: VideosFeedProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading')
  const [videos, setVideos] = useState<ContentVideo[]>([])

  useEffect(() => {
    let alive = true
    contentApi
      .videos()
      .then((list) => {
        if (!alive) return
        setVideos(list)
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
        LOADING VIDEOS …
      </p>
    )
  }

  if (state === 'offline' || videos.length === 0) {
    return <>{fallback}</>
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <VideoBlock
          key={video.id}
          src={resolveMediaUrl(video.src)}
          poster={video.poster ? resolveMediaUrl(video.poster) : undefined}
          title={video.title}
          description={video.description}
          tags={video.tags}
        />
      ))}
    </div>
  )
}
