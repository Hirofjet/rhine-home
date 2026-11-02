import { useEffect, useState } from 'react'
import { siteApi, type SiteHomeContent } from '../lib/api'

let cached: SiteHomeContent | null = null

const EMPTY: SiteHomeContent = {
  profile: null,
  abilities: [],
  contacts: [],
  links: [],
  updatedAt: null,
}

/** 主页统一内容：资料 / 能力 / 联系方式 / 链接，一次请求多处复用。 */
export function useSiteHomeContent(): SiteHomeContent {
  const [content, setContent] = useState<SiteHomeContent>(cached ?? EMPTY)

  useEffect(() => {
    if (cached) return undefined
    let alive = true
    siteApi
      .home()
      .then((data) => {
        cached = data
        if (alive) setContent(data)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  return content
}

export function invalidateSiteHomeContent() {
  cached = null
}
