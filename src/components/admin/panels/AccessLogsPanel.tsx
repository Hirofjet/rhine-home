import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { accessLogApi, type AccessLogEntry } from '../../../lib/api'

const formatRemaining = (seconds: number) => {
  if (seconds <= 0) return '已过期'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}天 ${hours}时 ${minutes}分`
}

export function AccessLogsPanel({ canDelete }: { canDelete: boolean }) {
  const [logs, setLogs] = useState<AccessLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const data = await accessLogApi.list()
      setLogs(data.logs)
      setError('')
    } catch {
      setError('没有访问日志管理权限。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const remove = async (id: number) => {
    await accessLogApi.remove(id)
    setLogs((items) => items.filter((item) => item.id !== id))
  }

  const clear = async (scope: 'all' | 'expired') => {
    if (scope === 'all' && !window.confirm('确定清空全部访问记录？')) return
    await accessLogApi.clear(scope)
    await load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-[0.1em]">访问记录</h2>
          <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
            ACCESS LOG / 30 DAYS RETENTION
          </p>
        </div>
        {canDelete && (
          <div className="flex gap-2">
            <button type="button" onClick={() => void clear('expired')} className="border border-rhine-line px-3 py-2 font-mono text-[9px]">
              清理过期
            </button>
            <button type="button" onClick={() => void clear('all')} className="border border-rhine-red/50 px-3 py-2 font-mono text-[9px] text-rhine-red">
              清空全部
            </button>
          </div>
        )}
      </div>

      {loading && <p className="font-mono text-xs text-rhine-faint">LOADING ACCESS LOGS...</p>}
      {error && <p className="border border-rhine-red/40 p-4 text-sm text-rhine-red">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto border border-rhine-line">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-rhine-panel-2 font-mono text-[8px] tracking-[0.18em] text-rhine-faint">
              <tr>
                <th className="p-3">用户</th>
                <th className="p-3">模块类型</th>
                <th className="p-3">访问对象</th>
                <th className="p-3">IP</th>
                <th className="p-3">访问时间</th>
                <th className="p-3">清除倒计时</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-rhine-line/60">
                  <td className="p-3">{log.username ?? '访客'}</td>
                  <td className="p-3 font-mono text-rhine-gold">{log.module_type}</td>
                  <td className="max-w-[220px] truncate p-3">{log.target_title ?? log.target_id ?? '—'}</td>
                  <td className="p-3 font-mono text-[10px] text-rhine-faint">{log.ip ?? '—'}</td>
                  <td className="p-3 font-mono text-[10px]">{log.created_at}</td>
                  <td className="p-3 font-mono text-[10px] text-rhine-dim">{formatRemaining(log.remaining_seconds)}</td>
                  <td className="p-3">
                    {canDelete ? (
                      <button type="button" onClick={() => void remove(log.id)} aria-label="删除记录" className="text-rhine-red">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-rhine-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-rhine-faint">暂无访问记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
