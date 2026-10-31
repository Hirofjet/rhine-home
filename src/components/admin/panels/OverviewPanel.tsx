import { useEffect, useState } from 'react'
import { adminApi, type AdminUser } from '../../../lib/adminApi'
import { AdminPanel } from '../AdminUi'

const MODULES = [
  { key: 'articles', label: '文章' },
  { key: 'logs', label: '日志' },
  { key: 'photos', label: '照片' },
  { key: 'videos', label: '视频' },
] as const

type ModuleKey = (typeof MODULES)[number]['key']

/** 概览：各模块条目数 + 当前账号信息 */
export function OverviewPanel({ user }: { user: AdminUser }) {
  const [counts, setCounts] = useState<Partial<Record<ModuleKey, number>>>({})

  useEffect(() => {
    let alive = true
    const load = async () => {
      const next: Partial<Record<ModuleKey, number>> = {}
      for (const module of MODULES) {
        if (user.role !== 'owner' && !user.permissions.includes(module.key)) continue
        try {
          const data = (await adminApi.list(module.key)) as { items: unknown[] }
          next[module.key] = data.items.length
        } catch {
          next[module.key] = 0
        }
      }
      if (alive) setCounts(next)
    }
    void load()
    return () => {
      alive = false
    }
  }, [user])

  return (
    <div className="space-y-4">
      <AdminPanel title="控制台概览" subtitle="OVERVIEW">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((module) => {
            const permitted =
              user.role === 'owner' || user.permissions.includes(module.key)
            return (
              <div
                key={module.key}
                className="border border-rhine-line bg-rhine-abyss/40 p-4"
              >
                <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                  {module.key.toUpperCase()}
                </p>
                <p className="mt-2 font-display text-2xl text-rhine-gold">
                  {permitted ? (counts[module.key] ?? '--') : '✕'}
                </p>
                <p className="mt-1 font-mono text-[10px] text-rhine-dim">
                  {module.label}
                  {permitted ? '' : '（无权限）'}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-5 space-y-1 border-t border-rhine-line/60 pt-4 font-mono text-[10px] leading-relaxed tracking-wider text-rhine-faint">
          <p>
            当前账号：{user.username}（{user.role === 'owner' ? 'OWNER' : 'ADMIN'}）
          </p>
          <p>
            可管理模块：
            {user.role === 'owner'
              ? '全部'
              : user.permissions.length > 0
                ? user.permissions.join(' / ')
                : '无'}
          </p>
          <p>后台入口不会出现在前台导航中，仅通过地址访问。</p>
        </div>
      </AdminPanel>
    </div>
  )
}
