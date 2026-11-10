import { useEffect, useState } from 'react'
import { Check, RefreshCw, ShieldAlert, X } from 'lucide-react'
import { adminApi, errorMessage } from '../../../lib/api'
import { formatDateTime } from '../../../lib/format'
import { AdminBadge, AdminButton, AdminError, AdminInput, AdminNotice, AdminPanel } from '../AdminUi'

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected' | 'appealed'

interface ReportRow {
  id: number
  ticket: string
  reporterName: string
  reporterContact: string | null
  targetType: string
  targetId: string
  category: string
  detail: string
  snapshot: string
  status: ReportStatus
  resolution: string | null
  appeal: string | null
  appealStatus: string
  createdAt: string
  handledAt: string | null
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: '待受理',
  reviewing: '处理中',
  resolved: '已处理',
  rejected: '未通过',
  appealed: '申诉中',
}

const CATEGORY_LABEL: Record<string, string> = {
  illegal: '违法有害',
  harassment: '骚扰',
  privacy: '隐私',
  copyright: '侵权',
  fraud: '诈骗',
  other: '其他',
}

export function ReportsPanel() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [canHandle, setCanHandle] = useState(true)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [hide, setHide] = useState<Record<number, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminApi.reports({ status: status || undefined })
      setReports(data.reports)
      setCanHandle(data.canHandle)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [status])

  const handle = async (report: ReportRow, next: 'reviewing' | 'resolved' | 'rejected') => {
    try {
      await adminApi.handleReport(report.id, {
        status: next,
        resolution: notes[report.id] ?? '',
        hideContent: hide[report.id] === true,
      })
      setNotice(`工单 ${report.ticket} 已更新`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="举报与投诉处理"
        subtitle="REPORTS / TRUST & SAFETY"
        actions={
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="border border-rhine-line bg-rhine-abyss px-2 py-1.5 font-mono text-[10px] text-rhine-ink"
            >
              <option value="">全部状态</option>
              <option value="pending">待受理</option>
              <option value="reviewing">处理中</option>
              <option value="appealed">申诉中</option>
              <option value="resolved">已处理</option>
              <option value="rejected">未通过</option>
            </select>
            <AdminButton variant="ghost" onClick={() => void load()}>
              <RefreshCw className="h-3 w-3" /> 刷新
            </AdminButton>
          </div>
        }
      >
        {loading ? (
          <p className="font-mono text-[10px] text-rhine-faint">加载中…</p>
        ) : reports.length === 0 ? (
          <p className="font-mono text-[10px] text-rhine-faint">当前没有举报工单。</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <article key={report.id} className="border border-rhine-line/70 bg-rhine-abyss/30 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rhine-red" />
                  <span className="font-mono text-[11px] text-rhine-cyan">{report.ticket}</span>
                  <AdminBadge
                    tone={
                      report.status === 'resolved'
                        ? 'green'
                        : report.status === 'rejected'
                          ? 'red'
                          : 'gold'
                    }
                  >
                    {STATUS_LABEL[report.status] ?? report.status}
                  </AdminBadge>
                  <span className="font-mono text-[9px] text-rhine-gold">
                    {CATEGORY_LABEL[report.category] ?? report.category}
                  </span>
                  <span className="font-mono text-[9px] text-rhine-faint">
                    {report.targetType} #{report.targetId} · {formatDateTime(report.createdAt)}
                  </span>
                </div>

                <div className="mt-2 grid gap-2 text-xs text-rhine-dim sm:grid-cols-2">
                  <p>举报人：{report.reporterName}</p>
                  <p>联系方式：{report.reporterContact ?? '—'}</p>
                </div>
                {report.detail && <p className="mt-2 text-xs leading-relaxed text-rhine-dim">{report.detail}</p>}
                {report.snapshot && (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap border border-rhine-line/50 bg-rhine-panel/30 p-2 font-mono text-[10px] leading-relaxed text-rhine-faint">
                    {report.snapshot}
                  </pre>
                )}
                {report.appeal && (
                  <p className="mt-2 border-l-2 border-rhine-gold/50 pl-2 text-xs text-rhine-gold">
                    申诉：{report.appeal}
                  </p>
                )}

                {canHandle && !['resolved', 'rejected'].includes(report.status) && (
                  <div className="mt-3 space-y-2">
                    <AdminInput
                      value={notes[report.id] ?? ''}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [report.id]: event.target.value }))
                      }
                      placeholder="处理说明（会通知举报人）"
                      className="w-full"
                    />
                    <label className="flex items-center gap-2 font-mono text-[9px] text-rhine-dim">
                      <input
                        type="checkbox"
                        checked={hide[report.id] === true}
                        onChange={(event) =>
                          setHide((current) => ({ ...current, [report.id]: event.target.checked }))
                        }
                      />
                      同时隐藏/拒绝被举报内容
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <AdminButton variant="ghost" onClick={() => void handle(report, 'reviewing')}>
                        标记处理中
                      </AdminButton>
                      <AdminButton onClick={() => void handle(report, 'resolved')}>
                        <Check className="h-3 w-3" /> 处理完成
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => void handle(report, 'rejected')}>
                        <X className="h-3 w-3" /> 驳回
                      </AdminButton>
                    </div>
                  </div>
                )}
                {report.resolution && (
                  <p className="mt-2 font-mono text-[10px] text-rhine-cyan">
                    结果：{report.resolution}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
