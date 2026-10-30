import { Play } from 'lucide-react'
import { cx } from '../../../lib/cx'
import { Tag } from '../../ui/Tag'

export interface VideoBlockProps {
  /**
   * 视频地址：本地文件放到 public/videos/ 下，填 '/videos/xxx.mp4'；
   * 也可以填完整的 http(s) 地址。留空则显示占位。
   */
  src?: string
  /** 封面图地址（可选） */
  poster?: string
  /** 视频标题（显示在播放器上方） */
  title?: string
  /** 视频简介（显示在标题下方） */
  description?: string
  /** 标签（显示在组件底部） */
  tags?: string[]
  className?: string
}

/** 视频组件：标题 + 简介 + 播放器（路径留空时显示占位） */
export function VideoBlock({
  src,
  poster,
  title,
  description,
  tags,
  className,
}: VideoBlockProps) {
  const heading = title?.trim() || '未命名视频'
  const intro = description?.trim() || '简介待填写…'

  return (
    <figure
      className={cx(
        'overflow-hidden border border-rhine-line bg-rhine-abyss/40',
        className,
      )}
    >
      {/* 标题 + 简介 */}
      <header className="border-b border-rhine-line/70 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="truncate text-sm font-medium text-rhine-ink">
            {heading}
          </h4>
          <span className="shrink-0 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
            VIDEO
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-rhine-dim">{intro}</p>
      </header>

      {/* 播放器 / 占位 */}
      {src ? (
        <video
          className="aspect-video max-h-[420px] w-full bg-black object-contain"
          controls
          preload="metadata"
          src={src}
          poster={poster}
        />
      ) : (
        <div className="flex aspect-video max-h-[300px] w-full flex-col items-center justify-center gap-3 bg-rhine-abyss/60">
          <span className="flex h-12 w-12 items-center justify-center border border-rhine-line text-rhine-faint">
            <Play className="h-5 w-5" />
          </span>
          <p className="font-mono text-[10px] tracking-[0.3em] text-rhine-faint">
            VIDEO // 待接入
          </p>
          <p className="px-6 text-center font-mono text-[10px] leading-relaxed tracking-wider text-rhine-faint">
            把视频放到 public/videos/，然后把 src 填成 /videos/xxx.mp4
          </p>
        </div>
      )}

      {/* 标签 */}
      {tags && tags.length > 0 && (
        <footer className="flex flex-wrap gap-2 border-t border-rhine-line/70 px-4 py-2">
          {tags.map((t) => (
            <Tag key={t} tone="cyan">
              {t}
            </Tag>
          ))}
        </footer>
      )}
    </figure>
  )
}
