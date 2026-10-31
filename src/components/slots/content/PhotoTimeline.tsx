import { useEffect, useState } from 'react'
import * as exifr from 'exifr'
import { ImageOff } from 'lucide-react'
import { cx } from '../../../lib/cx'
import { contentApi, resolveMediaUrl } from '../../../lib/contentApi'

/** 自动收集 src/assets/photos 下的图片（?url 获取可访问地址） */
const PHOTO_FILES = import.meta.glob(
  '/src/assets/photos/*.{jpg,jpeg,png,webp,avif,gif,svg}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

interface TimelinePhoto {
  key: string
  url: string
  name: string
  date: Date | null
}

/** 读取照片 EXIF 拍摄时间（优先 DateTimeOriginal，其次 CreateDate） */
async function readExifDate(url: string): Promise<Date | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const data = (await exifr.parse(buffer, [
      'DateTimeOriginal',
      'CreateDate',
    ])) as
      | { DateTimeOriginal?: Date | string; CreateDate?: Date | string }
      | undefined
    const raw = data?.DateTimeOriginal ?? data?.CreateDate
    const date =
      raw instanceof Date ? raw : typeof raw === 'string' ? new Date(raw) : null
    return date && !Number.isNaN(date.getTime()) ? date : null
  } catch {
    return null
  }
}

/** 没有 EXIF 时，从文件名解析 YYYY-MM-DD / YYYYMMDD（如 2024-05-01-xxx.jpg） */
function readDateFromName(path: string): Date | null {
  const m = /(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})/.exec(path)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(date: Date | null): string {
  if (!date) return '时间未知'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 照片时间线：
 * - 自动读取 src/assets/photos/ 下的所有图片；
 * - 优先用 EXIF 拍摄时间，其次用文件名里的日期，最后归入「未知时间」；
 * - 按时间先后排列，按年份分组渲染。
 */
export function PhotoTimeline({ className }: { className?: string }) {
  const [localPhotos, setLocalPhotos] = useState<TimelinePhoto[] | null>(null)
  const [remotePhotos, setRemotePhotos] = useState<TimelinePhoto[] | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const entries = Object.entries(PHOTO_FILES).map(([path, url]) => ({
        path,
        url,
      }))
      const parsed = await Promise.all(
        entries.map(async ({ path, url }) => ({
          key: path,
          url,
          name: path.split('/').pop() ?? path,
          date: (await readExifDate(url)) ?? readDateFromName(path),
        })),
      )
      if (alive) setLocalPhotos(parsed)
    }
    void load()
    return () => {
      alive = false
    }
  }, [])

  // 后台新增的照片（接口不可用时为空，不影响本地照片）
  useEffect(() => {
    let alive = true
    contentApi
      .photos()
      .then((list) => {
        if (!alive) return
        setRemotePhotos(
          list.map((photo) => ({
            key: `remote-${photo.id}`,
            url: resolveMediaUrl(photo.url),
            name: photo.name,
            date: photo.date ? new Date(photo.date) : null,
          })),
        )
      })
      .catch(() => {
        if (alive) setRemotePhotos([])
      })
    return () => {
      alive = false
    }
  }, [])

  const photos =
    localPhotos && remotePhotos
      ? [...localPhotos, ...remotePhotos].sort((a, b) => {
          const ta = a.date?.getTime() ?? Number.POSITIVE_INFINITY
          const tb = b.date?.getTime() ?? Number.POSITIVE_INFINITY
          return ta === tb ? a.name.localeCompare(b.name) : ta - tb
        })
      : null

  if (!photos) {
    return (
      <p
        className={cx(
          'animate-pulse-soft font-mono text-xs tracking-wider text-rhine-faint',
          className,
        )}
      >
        读取照片时间戳…
      </p>
    )
  }

  if (photos.length === 0) {
    return (
      <div
        className={cx(
          'flex flex-col items-center gap-2 border border-dashed border-rhine-line/80 p-6 text-center',
          className,
        )}
      >
        <ImageOff className="h-5 w-5 text-rhine-faint" />
        <p className="font-mono text-xs leading-relaxed tracking-wider text-rhine-faint">
          把照片放进 src/assets/photos/，会自动读取拍摄时间并按时间排序
        </p>
      </div>
    )
  }

  // 按年份分组（未识别时间的放最后）
  const groups: Array<{ year: string; items: TimelinePhoto[] }> = []
  for (const p of photos) {
    const year = p.date ? String(p.date.getFullYear()) : '未知时间'
    const group = groups.find((g) => g.year === year)
    if (group) group.items.push(p)
    else groups.push({ year, items: [p] })
  }

  return (
    <ol
      className={cx(
        'relative space-y-5 border-l border-rhine-line/70 pl-4',
        className,
      )}
    >
      {groups.map((group) => (
        <li key={group.year} className="relative">
          <span
            aria-hidden
            className="absolute -left-[21px] top-1.5 h-2 w-2 rotate-45 border border-rhine-gold bg-rhine-abyss"
          />
          <p className="font-mono text-[10px] tracking-[0.3em] text-rhine-gold">
            {group.year}
          </p>
          <div className="mt-2 space-y-3">
            {group.items.map((p) => (
              <figure
                key={p.key}
                className="flex gap-3 border border-rhine-line/70 bg-rhine-abyss/40 p-2"
              >
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-20 w-28 shrink-0 overflow-hidden border border-rhine-line/60"
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </a>
                <figcaption className="min-w-0 flex-1 py-0.5">
                  <p className="font-mono text-[11px] tracking-wider text-rhine-ink">
                    {formatDate(p.date)}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-rhine-faint">
                    {p.name}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}
