import { useEffect, useState } from 'react'
import { siteApi, type SiteHomeContent } from '../lib/api'

const STORAGE_KEY = 'rhine:site-home-cache'

const EMPTY: SiteHomeContent = {
  profile: null,
  abilities: [],
  contacts: [],
  links: [],
  updatedAt: null,
}

const isRealProfile = (data: SiteHomeContent | null): data is SiteHomeContent =>
  Boolean(data?.profile && !/sample|示例/i.test(data.profile.codeName))

const readCache = (): SiteHomeContent | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SiteHomeContent
    return isRealProfile(parsed) ? parsed : null
  } catch {
    return null
  }
}

let cached: SiteHomeContent | null = readCache()

/** 主页统一内容：资料 / 能力 / 联系方式 / 链接，一次请求多处复用。 */
export function useSiteHomeContent(): SiteHomeContent {
  const [content, setContent] = useState<SiteHomeContent>(cached ?? EMPTY)

  useEffect(() => {
    let alive = true
    const load = () => {
      siteApi
        .home()
        .then((data) => {
          if (isRealProfile(data)) {
            cached = data
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
            } catch {
              /* ignore */
            }
            if (alive) setContent(data)
          } else if (alive) {
            setContent(cached ?? EMPTY)
          }
        })
        .catch(() => undefined)
    }
    if (!cached) load()
    window.addEventListener('rhine:content-updated', load)
    return () => {
      alive = false
      window.removeEventListener('rhine:content-updated', load)
    }
  }, [])

  return content
}

export function invalidateSiteHomeContent() {
  cached = null
}
