import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import {
  securityLogApi,
  type AuditLogEntry,
  type RequestLogEntry,
  type SecurityLogQuery,
} from '../../../lib/api'

type Tab = 'requests' | 'audit'

const EMPTY_FILTERS: SecurityLogQuery = {
  q: '',
  method: '',
  status: '',
  from: '',
  to: '',
}

function statusClass(status: number) {
  if (status >= 500) return 'text-rhine-red'
  if (status >= 400) return 'text-rhine-gold'
  return 'text-rhine-cyan'
}

function shortHash(value: string | null) {
  return value ? `${value.slice(0, 12)}…` : '—'
}

export function SecurityLogsPanel() {
  const [tab, setTab] = useState<Tab>('requests')
  const [filters, setFilters] = useState<SecurityLogQuery>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<SecurityLogQuery>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [requestLogs, setRequestLogs] = useState<RequestLogEntry[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [retentionDays, setRetentionDays] = useState(180)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        if (tab === 'requests') {
          const data = await securityLogApi.requests({ ...applied, page, limit: 30 })
          if (!alive) return
          setRequestLogs(data.logs)
          setTotal(data.pagination.total)
          setRetentionDays(data.retentionDays ?? 180)
        } else {
          const data = await securityLogApi.audit({ ...applied, page, limit: 30 })
          if (!alive) return
          setAuditLogs(data.logs)
          setTotal(data.pagination.total)
        }
      } catch {
        if (alive) setError('没有安全日志读取权限，或日志服务暂不可用。')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [tab, applied, page])

  const applyFilters = () => {
    setPage(1)
    setApplied({ ...filters })
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(1)
  }

  const exportCurrent = async () => {
    try {
      const blob =
        tab === 'requests'
          ? await securityLogApi.exportRequests({ ...applied })
          : await securityLogApi.exportAudit({ ...applied })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download =
        tab === 'requests'
          ? `request-logs-${new Date().toISOString().slice(0, 10)}.csv`
          : `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('导出失败，请重试。')
    }
  }

  const pages = Math.max(1, Math.ceil(total / 30))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-[0.1em]">安全日志</h2>
          <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
            REQUEST LOGS / {retentionDays} DAYS · AUDIT LOGS / IMMUTABLE
          </p>
        </div>
        <span className="border border-rhine-gold/40 px-3 py-2 font-mono text-[9px] tracking-wider text-rhine-gold">
          APPEND-ONLY · NO DELETE
        </span>
      </div>

      <div className="flex gap-2">
        {([
          ['requests', '请求日志', 'REQUESTS'],
          ['audit', '审计日志', 'AUDIT'],
        ] as const).map(([key, zh, en]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key)
              setPage(1)
            }}
            className={
              tab === key
                ? 'border border-rhine-gold bg-rhine-gold/10 px-3 py-2 text-left'
                : 'border border-rhine-line px-3 py-2 text-left text-rhine-dim'
            }
          >
            <span className="block text-xs">{zh}</span>
            <span className="font-mono text-[8px] tracking-[0.2em] opacity-60">{en}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-2 border border-rhine-line/60 bg-rhine-panel/30 p-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          value={filters.q ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyFilters()
          }}
          placeholder="路径 / 用户 / IP / 请求ID"
          className="border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-[10px] outline-none focus:border-rhine-gold/60 sm:col-span-2"
        />
        <input
          value={filters.method ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value }))}
          placeholder="METHOD"
          className="border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-[10px] uppercase outline-none focus:border-rhine-gold/60"
        />
        <input
          value={filters.status ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="STATUS"
          className="border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-[10px] outline-none focus:border-rhine-gold/60"
        />
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
          className="border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-[10px] outline-none focus:border-rhine-gold/60"
        />
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
          className="border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-[10px] outline-none focus:border-rhine-gold/60"
        />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button
            type="button"
            onClick={applyFilters}
            className="border border-rhine-gold/60 px-3 py-2 font-mono text-[9px] text-rhine-gold"
          >
            应用筛选
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="border border-rhine-line px-3 py-2 font-mono text-[9px] text-rhine-dim"
          >
            重置
          </button>
          <button
            type="button"
            onClick={() => void exportCurrent()}
            className="inline-flex items-center gap-1 border border-rhine-line px-3 py-2 font-mono text-[9px] text-rhine-dim hover:text-rhine-gold"
          >
            <Download className="h-3 w-3" /> 导出当前筛选
          </button>
          <span className="ml-auto self-center font-mono text-[9px] text-rhine-faint">
            {total} RECORDS
          </span>
        </div>
      </div>

      {loading && <p className="font-mono text-xs text-rhine-faint">LOADING SECURITY LOGS...</p>}
      {error && <p className="border border-rhine-red/40 p-4 text-sm text-rhine-red">{error}</p>}

      {!loading && !error && tab === 'requests' && (
        <div className="overflow-x-auto border border-rhine-line">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-rhine-panel-2 font-mono text-[8px] tracking-[0.18em] text-rhine-faint">
              <tr>
                <th className="p-3">时间</th>
                <th className="p-3">用户</th>
                <th className="p-3">IP</th>
                <th className="p-3">方法</th>
                <th className="p-3">路径</th>
                <th className="p-3">状态</th>
                <th className="p-3">耗时</th>
                <th className="p-3">请求ID</th>
              </tr>
            </thead>
            <tbody>
              {requestLogs.map((log) => (
                <tr key={log.id} className="border-t border-rhine-line/60">
                  <td className="whitespace-nowrap p-3 font-mono text-[10px] text-rhine-dim">
                    {log.created_at}
                  </td>
                  <td className="p-3 text-rhine-ink">{log.username ?? '访客'}</td>
                  <td className="p-3 font-mono text-[10px] text-rhine-faint">
                    {log.ip ?? '—'}
                    {log.remote_port ? `:${log.remote_port}` : ''}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-rhine-gold">{log.method}</td>
                  <td className="max-w-[360px] break-all p-3 font-mono text-[10px] text-rhine-dim">
                    {log.path}
                    {log.query_keys ? <span className="text-rhine-faint"> ?{log.query_keys}</span> : null}
                  </td>
                  <td className={`p-3 font-mono text-[10px] ${statusClass(log.status)}`}>
                    {log.status}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-rhine-faint">{log.duration_ms}ms</td>
                  <td className="p-3 font-mono text-[9px] text-rhine-faint" title={log.request_id}>
                    {shortHash(log.request_id)}
                  </td>
                </tr>
              ))}
              {requestLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-rhine-faint">
                    暂无请求日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tab === 'audit' && (
        <div className="overflow-x-auto border border-rhine-line">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="bg-rhine-panel-2 font-mono text-[8px] tracking-[0.18em] text-rhine-faint">
              <tr>
                <th className="p-3">时间</th>
                <th className="p-3">操作者</th>
                <th className="p-3">动作</th>
                <th className="p-3">对象</th>
                <th className="p-3">结果</th>
                <th className="p-3">IP</th>
                <th className="p-3">哈希链</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-rhine-line/60">
                  <td className="whitespace-nowrap p-3 font-mono text-[10px] text-rhine-dim">
                    {log.created_at}
                  </td>
                  <td className="p-3 text-rhine-ink">{log.actor_username ?? '—'}</td>
                  <td className="max-w-[320px] break-all p-3 font-mono text-[10px] text-rhine-gold">
                    {log.action}
                  </td>
                  <td className="max-w-[220px] p-3 text-rhine-dim">
                    <span className="font-mono text-[9px] text-rhine-faint">
                      {log.target_type ?? '—'}
                    </span>
                    <span className="mt-0.5 block break-all">
                      {log.target_label ?? log.target_id ?? '—'}
                    </span>
                  </td>
                  <td className={`p-3 font-mono text-[10px] ${statusClass(log.status)}`}>
                    {log.status}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-rhine-faint">{log.ip ?? '—'}</td>
                  <td
                    className="p-3 font-mono text-[9px] text-rhine-faint"
                    title={`prev ${log.prev_hash}\nentry ${log.entry_hash}`}
                  >
                    {shortHash(log.entry_hash)}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-rhine-faint">
                    暂无审计日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] text-rhine-faint">
            PAGE {page} / {pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="border border-rhine-line px-3 py-2 font-mono text-[9px] disabled:opacity-30"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
              className="border border-rhine-line px-3 py-2 font-mono text-[9px] disabled:opacity-30"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
