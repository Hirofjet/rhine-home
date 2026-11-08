import { useEffect, useState } from 'react'
import * as exifr from 'exifr'
import { cx } from '../../../lib/cx'
import { contentApi, resolveMediaUrl } from '../../../lib/api'

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
  description?: string
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
  const [orientations, setOrientations] = useState<Record<string, 'portrait' | 'landscape'>>({})

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
    const loadRemote = () => {
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
              description: photo.description ?? '',
            })),
          )
        })
        .catch(() => {
          if (alive) setRemotePhotos([])
        })
    }
    loadRemote()
    window.addEventListener('rhine:content-updated', loadRemote)
    return () => {
      alive = false
      window.removeEventListener('rhine:content-updated', loadRemote)
    }
  }, [])

  const photos =
    localPhotos && remotePhotos
      ? [...localPhotos, ...remotePhotos].sort((a, b) => {
          const ta = a.date?.getTime() ?? Number.NEGATIVE_INFINITY
          const tb = b.date?.getTime() ?? Number.NEGATIVE_INFINITY
          return ta === tb ? a.name.localeCompare(b.name) : tb - ta
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
      <p className="border border-dashed border-rhine-line/70 px-4 py-10 text-center font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
        暂无已发布照片
      </p>
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
    <ol className={cx('relative mx-auto max-w-5xl pb-6', className)}>
      <span
        aria-hidden
        className="absolute bottom-0 left-4 top-0 w-px bg-rhine-line/70 md:left-1/2"
      />
      {groups.map((group) => (
        <li key={group.year} className="relative pb-9">
          <div className="relative z-10 mb-6 flex justify-start md:justify-center">
            <span className="ml-10 border border-rhine-gold/50 bg-rhine-abyss px-3 py-1 font-mono text-[10px] tracking-[0.35em] text-rhine-gold md:ml-0">
              {group.year}
            </span>
          </div>
          <div className="space-y-7 md:space-y-9">
            {group.items.map((p) => {
              const index = photos.indexOf(p)
              const left = index % 2 === 0
              const portrait = orientations[p.key] === 'portrait'
              return (
                <article
                  key={p.key}
                  className="relative md:grid md:grid-cols-2 md:gap-12"
                >
                  <span
                    aria-hidden
                    className="absolute left-4 top-8 z-10 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border border-rhine-gold bg-rhine-abyss md:left-1/2"
                  />
                  <div
                    className={cx(
                      'ml-10 md:ml-0',
                      left ? 'md:col-start-1 md:pr-10' : 'md:col-start-2 md:pl-10',
                    )}
                  >
                    <figure className="group overflow-hidden border border-rhine-line/70 bg-rhine-abyss/50 p-2.5 transition-colors hover:border-rhine-gold/50">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden border border-rhine-line/50 bg-rhine-abyss"
                      >
                        <img
                          src={p.url}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          onLoad={(event) => {
                            const image = event.currentTarget
                            const next =
                              image.naturalHeight > image.naturalWidth
                                ? 'portrait'
                                : 'landscape'
                            setOrientations((current) =>
                              current[p.key] === next
                                ? current
                                : { ...current, [p.key]: next },
                            )
                          }}
                          className={cx(
                            'block transition-transform duration-500 group-hover:scale-[1.015]',
                            portrait
                              ? 'mx-auto h-auto max-h-[32rem] w-auto max-w-full object-contain'
                              : 'h-auto max-h-[26rem] w-full object-contain',
                          )}
                        />
                      </a>
                      <figcaption className="px-1 pb-1 pt-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-mono text-[11px] tracking-wider text-rhine-ink">
                            {formatDate(p.date)}
                          </p>
                          <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                            {portrait ? 'PORTRAIT' : 'LANDSCAPE'}
                          </span>
                        </div>
                        {p.description && (
                          <p className="mt-1 text-xs leading-relaxed text-rhine-dim">
                            {p.description}
                          </p>
                        )}
                        <p className="mt-1 truncate font-mono text-[10px] text-rhine-faint">
                          {p.name}
                        </p>
                      </figcaption>
                    </figure>
                  </div>
                </article>
              )
            })}
          </div>
        </li>
      ))}
    </ol>
  )
}
