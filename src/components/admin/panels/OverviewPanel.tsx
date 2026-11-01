import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight } from 'lucide-react'
import {
  adminApi,
  API_BASE,
  errorMessage,
  ROLE_LABELS,
  type ApiUser,
} from '../../../lib/api'
import { AdminBadge, AdminError, AdminPanel } from '../AdminUi'

interface OverviewPanelProps {
  user: ApiUser
  onNavigate?: (key: string) => void
}

const CARDS: Array<{ key: string; label: string; target?: string; tone?: 'gold' | 'cyan' | 'red' }> = [
  { key: 'articles', label: '文章', target: 'articles' },
  { key: 'photos', label: '照片', target: 'photos' },
  { key: 'videos', label: '视频', target: 'videos' },
  { key: 'logs', label: '日志', target: 'logs' },
  { key: 'boards', label: '论坛板块', target: 'forum-boards' },
  { key: 'pendingPosts', label: '待审帖子', target: 'review', tone: 'gold' },
  { key: 'pendingReplies', label: '待审回复', target: 'review', tone: 'gold' },
  { key: 'users', label: '成员', target: 'members', tone: 'cyan' },
]

export function OverviewPanel({ user, onNavigate }: OverviewPanelProps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking')

  useEffect(() => {
    let alive = true
    adminApi
      .overview()
      .then((data) => {
        if (alive) setCounts(data.counts)
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data: { ok?: boolean }) => {
        if (alive) setHealth(data.ok ? 'ok' : 'down')
      })
      .catch(() => {
        if (alive) setHealth('down')
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminPanel title="控制台概览" subtitle="OVERVIEW">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.filter((card) => counts[card.key] !== undefined).map((card) => {
            const value = counts[card.key] ?? 0
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => card.target && onNavigate?.(card.target)}
                className="group border border-rhine-line bg-rhine-abyss/40 p-4 text-left transition-colors hover:border-rhine-gold/50"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                    {card.key.toUpperCase()}
                  </p>
                  {card.target && (
                    <ArrowUpRight className="h-3 w-3 text-rhine-faint opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>
                <p
                  className={`mt-2 font-display text-2xl ${
                    card.tone === 'cyan'
                      ? 'text-rhine-cyan'
                      : card.tone === 'red'
                        ? 'text-rhine-red'
                        : 'text-rhine-gold'
                  }`}
                >
                  {value}
                </p>
                <p className="mt-1 font-mono text-[10px] text-rhine-dim">{card.label}</p>
              </button>
            )
          })}
        </div>

        {Object.keys(counts).length === 0 && (
          <p className="mt-4 font-mono text-[10px] tracking-wider text-rhine-faint">
            暂无可统计的模块
          </p>
        )}

        {Object.keys(counts).length > 0 && (
          <div className="mt-5 space-y-1.5 border-t border-rhine-line/60 pt-4">
            <p className="mb-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
              数据分布 / DISTRIBUTION
            </p>
            {(() => {
              const max = Math.max(...Object.values(counts), 1)
              return CARDS.filter((card) => counts[card.key] !== undefined).map((card) => {
                const value = counts[card.key] ?? 0
                const percent = Math.round((value / max) * 100)
                return (
                  <div key={card.key} className="flex items-center gap-2">
                    <span className="w-20 font-mono text-[10px] text-rhine-dim">
                      {card.label}
                    </span>
                    <div className="h-2 flex-1 bg-rhine-abyss">
                      <div
                        className="h-full bg-rhine-gold/60"
                        style={{ width: `${Math.max(percent, 2)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-[10px] text-rhine-gold">
                      {value}
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-rhine-line/60 pt-4 font-mono text-[10px] tracking-wider text-rhine-dim">
          <span className="flex items-center gap-2">
            <Activity
              className={`h-3.5 w-3.5 ${
                health === 'ok'
                  ? 'text-rhine-green'
                  : health === 'down'
                    ? 'text-rhine-red'
                    : 'text-rhine-gold'
              }`}
            />
            服务状态：
            {health === 'ok' ? 'MySQL 已连接' : health === 'down' ? '无法连接后端' : '检测中…'}
          </span>
          <span>
            当前账号：{user.username}（{ROLE_LABELS[user.role]}）
          </span>
          {user.isSuper ? (
            <AdminBadge tone="gold">SUPERUSER</AdminBadge>
          ) : (
            <AdminBadge tone="cyan">{user.permissions.length} 项权限</AdminBadge>
          )}
        </div>

        <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-wider text-rhine-faint">
          数据实时读取自 MySQL。
        </p>
      </AdminPanel>
    </div>
  )
}
