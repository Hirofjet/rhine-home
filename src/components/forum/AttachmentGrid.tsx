import { Download, Film } from 'lucide-react'
import type { Attachment } from '../../lib/api'
import { resolveMediaUrl } from '../../lib/api'

/** 论坛附件展示：图片网格 / 视频播放器 / 文件下载 */
export function AttachmentGrid({ attachments }: { attachments: Attachment[] }) {
  const images = attachments.filter((item) => item.type === 'image')
  const videos = attachments.filter((item) => item.type === 'video')
  const files = attachments.filter((item) => item.type === 'file')
  if (!attachments.length) return null

  return (
    <div className="mt-4 space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image, index) => (
            <a
              key={`${image.url}-${index}`}
              href={resolveMediaUrl(image.url)}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden border border-rhine-line/70 bg-rhine-abyss/60"
            >
              <img
                src={resolveMediaUrl(image.url)}
                alt={image.name || '附件图片'}
                loading="lazy"
                decoding="async"
                className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </a>
          ))}
        </div>
      )}

      {videos.map((video, index) => (
        <div key={`${video.url}-${index}`} className="border border-rhine-line/70 bg-black/60">
          <div className="flex items-center gap-2 border-b border-rhine-line/50 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
            <Film className="h-3 w-3" />
            {video.name || 'VIDEO'}
          </div>
          <video
            src={resolveMediaUrl(video.url)}
            controls
            preload="metadata"
            className="max-h-[380px] w-full"
          />
        </div>
      ))}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li key={`${file.url}-${index}`}>
              <a
                href={resolveMediaUrl(file.url)}
                download={file.name || undefined}
                className="inline-flex items-center gap-2 font-mono text-[10px] tracking-wider text-rhine-cyan hover:text-rhine-gold"
              >
                <Download className="h-3 w-3" />
                {file.name || file.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
