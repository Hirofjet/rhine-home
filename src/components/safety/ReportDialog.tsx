import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import { errorMessage, reportApi, type ReportCategory } from '../../lib/api'
import { useSession } from '../auth/useSession'

const CATEGORIES: Array<[ReportCategory, string]> = [
  ['illegal', '违法有害信息'],
  ['harassment', '骚扰 / 辱骂'],
  ['privacy', '隐私泄露'],
  ['copyright', '侵权 / 版权'],
  ['fraud', '诈骗 / 广告'],
  ['other', '其他'],
]

export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  className,
}: {
  targetType: 'post' | 'reply' | 'message' | 'user' | 'guestbook' | 'complaint'
  targetId?: string | number
  targetLabel?: string
  className?: string
}) {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ReportCategory>('illegal')
  const [detail, setDetail] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const data = await reportApi.create({
        targetType,
        targetId,
        category,
        detail,
        contact: contact.trim() || undefined,
      })
      setTicket(data.ticket)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-1 font-mono text-[9px] tracking-wider text-rhine-faint hover:text-rhine-red'
        }
      >
        <Flag className="h-3 w-3" /> 举报
      </button>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-rhine-abyss/80 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="举报或投诉"
            className="w-full max-w-lg border border-rhine-line bg-rhine-panel p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.25em] text-rhine-gold">
                  TRUST &amp; SAFETY
                </p>
                <h2 className="mt-1 text-lg font-bold text-rhine-ink">举报 / 投诉</h2>
                {targetLabel && (
                  <p className="mt-1 line-clamp-2 font-mono text-[10px] text-rhine-faint">
                    {targetLabel}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="text-rhine-faint hover:text-rhine-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ticket ? (
              <div className="mt-5 border border-rhine-cyan/40 bg-rhine-cyan/5 p-4">
                <p className="text-sm text-rhine-ink">举报已提交</p>
                <p className="mt-2 font-mono text-xs text-rhine-cyan">工单号：{ticket}</p>
                <p className="mt-2 text-xs leading-relaxed text-rhine-dim">
                  请保存工单号，可在「投诉举报」页面查询处理状态。恶意举报会被记录。
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 border border-rhine-line px-3 py-2 font-mono text-[9px] text-rhine-dim"
                >
                  关闭
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block space-y-1">
                  <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                    分类
                  </span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ReportCategory)}
                    className="w-full border border-rhine-line bg-rhine-abyss px-3 py-2 text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
                  >
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                    情况说明
                  </span>
                  <textarea
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="请说明具体问题、时间或涉及的内容。"
                    className="w-full resize-y border border-rhine-line bg-rhine-abyss px-3 py-2 text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
                  />
                </label>
                {!user && (
                  <label className="block space-y-1">
                    <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                      联系方式（必填，不会公开）
                    </span>
                    <input
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      maxLength={190}
                      placeholder="邮箱或其他联系方式"
                      className="w-full border border-rhine-line bg-rhine-abyss px-3 py-2 text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
                    />
                  </label>
                )}
                {error && <p className="text-xs text-rhine-red">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="border border-rhine-line px-3 py-2 font-mono text-[9px] text-rhine-dim"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={busy || detail.trim().length < 5 || (!user && !contact.trim())}
                    onClick={() => void submit()}
                    className="border border-rhine-red/50 bg-rhine-red/10 px-3 py-2 font-mono text-[9px] text-rhine-red disabled:opacity-40"
                  >
                    {busy ? '提交中…' : '提交举报'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
