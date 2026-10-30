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
  /** 视频标题 */
  title?: string
  /** 视频描述 */
  description?: string
  /** 标签（显示在组件底部） */
  tags?: string[]
  className?: string
}

/** 视频组件：路径留空时显示占位，填入后渲染原生播放器 */
export function VideoBlock({
  src,
  poster,
  title,
  description,
  tags,
  className,
}: VideoBlockProps) {
  return (
    <figure
      className={cx(
        'overflow-hidden border border-rhine-line bg-rhine-abyss/40',
        className,
      )}
    >
      {src ? (
        <video
          className="aspect-video w-full bg-black"
          controls
          preload="metadata"
          src={src}
          poster={poster}
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 border-b border-rhine-line/60 bg-rhine-abyss/60">
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

      <figcaption className="px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-medium text-rhine-ink">
            {title ?? '未命名视频'}
          </h4>
          <span className="font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
            VIDEO
          </span>
        </div>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-rhine-dim">
            {description}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Tag key={t} tone="cyan">
                {t}
              </Tag>
            ))}
          </div>
        )}
      </figcaption>
    </figure>
  )
}
