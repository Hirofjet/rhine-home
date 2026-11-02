import { useEffect, useState } from 'react'
import { contentApi, type SiteProject } from '../lib/api'
import { projects as fallback, type Project, type ProjectStatus } from '../content'

const toProject = (item: SiteProject): Project => ({
  id: String(item.id),
  code: item.code,
  title: item.name,
  subtitle: item.shortName,
  description: item.description,
  tags: item.tags,
  status: item.status as ProjectStatus,
  link: item.githubUrl,
  shortName: item.shortName,
  type: item.type,
  author: item.author,
  version: item.version,
  githubUrl: item.githubUrl,
  details: item.details,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
})

/** 项目数据：优先读取后台管理的项目库，接口不可用时回退到本地示例。 */
export function useSiteProjects(): Project[] {
  const [items, setItems] = useState<Project[]>(fallback)
  useEffect(() => {
    let alive = true
    const load = () => {
      contentApi
        .projects()
        .then((list) => {
          if (alive) setItems(list.map(toProject))
        })
        .catch(() => undefined)
    }
    load()
    window.addEventListener('rhine:content-updated', load)
    return () => {
      alive = false
      window.removeEventListener('rhine:content-updated', load)
    }
  }, [])
  return items
}
