/* oxlint-disable react/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { securityLogApi, type AuditLogEntry, type SecurityLogQuery } from '../../../lib/api'
import { AdminButton, AdminError, AdminInput, AdminNotice, AdminPanel } from '../AdminUi'

const EMPTY: SecurityLogQuery = {
  q: '',
  action: '',
  from: '',
  to: '',
  scope: 'review',
}

export function ReviewLogsPanel() {
  const [draft, setDraft] = useState<SecurityLogQuery>(EMPTY)
  const [applied, setApplied] = useState<SecurityLogQuery>(EMPTY)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    securityLogApi
      .audit({ ...applied, scope: 'review', page, limit: 30 })
      .then((data) => {
        if (!alive) return
        setLogs(data.logs)
        setTotal(data.pagination.total)
      })
      .catch(() => {
        if (alive) setError('审核日志读取失败或没有权限。')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [applied, page])

  const apply = () => {
    setPage(1)
    setApplied({ ...draft })
  }

  const exportCsv = async () => {
    try {
      const blob = await securityLogApi.exportAudit({ ...applied })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      setNotice('已按当前筛选条件导出 CSV')
    } catch {
      setError('导出失败，请重试。')
    }
  }

  const pages = Math.max(1, Math.ceil(total / 30))

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel title="审核日志" subtitle="REVIEW AUDIT LOGS">
        <p className="mb-3 font-mono text-[9px] leading-relaxed text-rhine-faint">
          与安全日志共用不可篡改的 SHA-256 审计链；导出内容严格等于当前已应用的筛选结果。
        </p>
        <div className="grid gap-2 border border-rhine-line/60 bg-rhine-panel/30 p-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex items-center gap-1 border border-rhine-line bg-rhine-abyss px-2 sm:col-span-2">
            <Search className="h-3 w-3 text-rhine-faint" />
            <input
              value={draft.q ?? ''}
              onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') apply()
              }}
              placeholder="操作者 / 路径 / 对象 / IP"
              className="w-full bg-transparent py-2 font-mono text-[10px] outline-none"
            />
          </div>
          <AdminInput
            value={draft.action ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}
            placeholder="动作精确匹配，如 review"
          />
          <input
            type="date"
            value={draft.from ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
            className="border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-[10px] outline-none"
          />
          <input
            type="date"
            value={draft.to ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
            className="border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-[10px] outline-none"
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
            <AdminButton onClick={apply}>应用筛选</AdminButton>
            <AdminButton
              variant="ghost"
              onClick={() => {
                setDraft(EMPTY)
                setApplied(EMPTY)
                setPage(1)
              }}
            >
              重置
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => void exportCsv()}>
              <Download className="h-3 w-3" /> 导出当前筛选结果
            </AdminButton>
            <span className="ml-auto self-center font-mono text-[9px] text-rhine-faint">
              {total} RECORDS
            </span>
          </div>
        </div>
      </AdminPanel>

      <div className="overflow-x-auto border border-rhine-line">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="bg-rhine-panel-2 font-mono text-[8px] tracking-[0.18em] text-rhine-faint">
            <tr>
              <th className="p-3">时间</th>
              <th className="p-3">操作者</th>
              <th className="p-3">动作</th>
              <th className="p-3">对象</th>
              <th className="p-3">状态</th>
              <th className="p-3">IP / 路径</th>
              <th className="p-3">哈希</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-rhine-line/60">
                <td className="whitespace-nowrap p-3 font-mono text-[10px] text-rhine-dim">{log.created_at}</td>
                <td className="p-3 text-rhine-ink">{log.actor_username ?? '系统'}</td>
                <td className="p-3 font-mono text-[10px] text-rhine-gold">{log.action}</td>
                <td className="max-w-[260px] break-all p-3 font-mono text-[9px] text-rhine-dim">
                  {log.target_type ?? '—'}
                  {log.target_id ? ` #${log.target_id}` : ''}
                  {log.target_label ? ` · ${log.target_label}` : ''}
                </td>
                <td className="p-3 font-mono text-[10px] text-rhine-cyan">{log.status}</td>
                <td className="max-w-[300px] break-all p-3 font-mono text-[9px] text-rhine-faint">
                  {log.ip ?? '—'} · {log.path ?? '—'}
                </td>
                <td className="p-3 font-mono text-[8px] text-rhine-faint" title={log.entry_hash}>
                  {log.entry_hash.slice(0, 12)}…
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-rhine-faint">暂无审核日志</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between font-mono text-[9px] text-rhine-faint">
        <span>PAGE {page}/{pages}</span>
        <div className="flex gap-2">
          <AdminButton variant="ghost" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
            上一页
          </AdminButton>
          <AdminButton variant="ghost" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page >= pages}>
            下一页
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
