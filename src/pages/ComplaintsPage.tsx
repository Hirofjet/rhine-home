import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Flag, Search, ShieldCheck } from 'lucide-react'
import { errorMessage, reportApi, type PublicReport, type ReportCategory } from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { legal } from '../content/legal'

const CATEGORIES: Array<[ReportCategory, string]> = [
  ['illegal', '违法有害信息'],
  ['harassment', '骚扰 / 辱骂'],
  ['privacy', '隐私泄露'],
  ['copyright', '侵权 / 版权'],
  ['fraud', '诈骗 / 广告'],
  ['other', '其他'],
]

const STATUS_LABELS: Record<string, string> = {
  pending: '待受理',
  reviewing: '处理中',
  resolved: '已处理',
  rejected: '未通过',
  appealed: '申诉中',
}

export function ComplaintsPage() {
  const { user } = useSession()
  const [category, setCategory] = useState<ReportCategory>('illegal')
  const [detail, setDetail] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState('')
  const [error, setError] = useState('')
  const [lookup, setLookup] = useState('')
  const [report, setReport] = useState<PublicReport | null>(null)
  const [lookupBusy, setLookupBusy] = useState(false)

  const submit = async () => {
    if (detail.trim().length < 5 || (!user && !contact.trim())) return
    setBusy(true)
    setError('')
    try {
      const data = await reportApi.create({
        targetType: 'complaint',
        category,
        detail,
        contact: contact.trim() || undefined,
      })
      setTicket(data.ticket)
      setDetail('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const query = async () => {
    if (!lookup.trim()) return
    setLookupBusy(true)
    setReport(null)
    try {
      const data = await reportApi.lookup(lookup.trim().toUpperCase())
      setReport(data.report)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLookupBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-24 sm:px-6">
      <Link
        to="/legal"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint hover:text-rhine-gold"
      >
        <ArrowLeft className="h-3 w-3" /> 法律与安全
      </Link>

      <header className="mt-5 border-b border-rhine-line/70 pb-5">
        <p className="font-mono text-[10px] tracking-[0.3em] text-rhine-gold">TRUST &amp; SAFETY</p>
        <h1 className="mt-2 text-3xl font-bold text-rhine-ink">投诉与举报</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-rhine-dim">
          对违法有害信息、骚扰、隐私泄露、侵权或诈骗进行举报。请尽量提供具体内容、时间和证据；
          恶意举报会被记录并可能限制使用。
        </p>
      </header>

      <section className="mt-6 border border-rhine-line/70 bg-rhine-panel/30 p-5">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-rhine-gold">
          <ShieldCheck className="h-3.5 w-3.5" /> 受理说明
        </p>
        <div className="mt-3 grid gap-2 text-xs leading-relaxed text-rhine-dim sm:grid-cols-3">
          <p>24 小时内确认受理</p>
          <p>72 小时内完成初核</p>
          <p>一般事项 15 个工作日内办结</p>
        </div>
        <p className="mt-3 text-xs text-rhine-faint">
          紧急违法信息或人身安全风险，请同时联系属地公安机关。网站联系方式：
          <a href={legal.contact} className="ml-1 text-rhine-cyan underline underline-offset-2">
            {legal.complaintEmail || legal.contact}
          </a>
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="border border-rhine-line/70 bg-rhine-panel/25 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-rhine-ink">
            <Flag className="h-4 w-4 text-rhine-red" /> 提交投诉 / 举报
          </h2>
          {ticket ? (
            <div className="mt-4 border border-rhine-cyan/40 bg-rhine-cyan/5 p-4">
              <p className="text-sm text-rhine-ink">工单已创建</p>
              <p className="mt-2 font-mono text-sm text-rhine-cyan">{ticket}</p>
              <p className="mt-2 text-xs text-rhine-dim">请保存工单号，在右侧查询处理进度。</p>
              <button
                type="button"
                onClick={() => setTicket('')}
                className="mt-4 border border-rhine-line px-3 py-2 font-mono text-[9px] text-rhine-dim"
              >
                再提交一条
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block space-y-1">
                <span className="font-mono text-[9px] tracking-wider text-rhine-faint">分类</span>
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
                  具体说明
                </span>
                <textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="请描述问题、涉及链接/用户、发生时间和相关证据。"
                  className="w-full resize-y border border-rhine-line bg-rhine-abyss px-3 py-2 text-xs leading-relaxed text-rhine-ink outline-none focus:border-rhine-gold/60"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                  联系方式（{user ? '可选' : '必填'}，不公开）
                </span>
                <input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  maxLength={190}
                  placeholder="邮箱或其他联系方式"
                  className="w-full border border-rhine-line bg-rhine-abyss px-3 py-2 text-xs text-rhine-ink outline-none focus:border-rhine-gold/60"
                />
              </label>
              {error && <p className="text-xs text-rhine-red">{error}</p>}
              <button
                type="button"
                disabled={busy || detail.trim().length < 5 || (!user && !contact.trim())}
                onClick={() => void submit()}
                className="border border-rhine-red/50 bg-rhine-red/10 px-4 py-2.5 font-mono text-[10px] text-rhine-red disabled:opacity-40"
              >
                {busy ? '提交中…' : '提交工单'}
              </button>
            </div>
          )}
        </section>

        <section className="border border-rhine-line/70 bg-rhine-panel/25 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-rhine-ink">
            <Search className="h-4 w-4 text-rhine-gold" /> 查询工单
          </h2>
          <div className="mt-4 flex gap-2">
            <input
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void query()
              }}
              placeholder="输入工单号"
              className="min-w-0 flex-1 border border-rhine-line bg-rhine-abyss px-3 py-2 font-mono text-xs uppercase text-rhine-ink outline-none focus:border-rhine-gold/60"
            />
            <button
              type="button"
              disabled={lookupBusy}
              onClick={() => void query()}
              className="border border-rhine-line px-3 py-2 font-mono text-[9px] text-rhine-dim disabled:opacity-40"
            >
              查询
            </button>
          </div>
          {report && (
            <div className="mt-4 space-y-2 border border-rhine-line/60 bg-rhine-abyss/50 p-3 text-xs text-rhine-dim">
              <p>
                工单：<span className="font-mono text-rhine-cyan">{report.ticket}</span>
              </p>
              <p>分类：{report.category}</p>
              <p>状态：{STATUS_LABELS[report.status] ?? report.status}</p>
              <p>提交：{report.createdAt}</p>
              {report.resolution && <p>处理结果：{report.resolution}</p>}
              {report.handledAt && <p>处理时间：{report.handledAt}</p>}
              {user &&
                report.appealStatus === 'none' &&
                (report.status === 'resolved' || report.status === 'rejected') && (
                  <button
                    type="button"
                    onClick={async () => {
                      const text = window.prompt('请输入申诉说明')
                      if (!text?.trim()) return
                      try {
                        await reportApi.appeal(report.ticket, text.trim())
                        setReport({ ...report, status: 'appealed', appealStatus: 'pending' })
                      } catch (err) {
                        setError(errorMessage(err))
                      }
                    }}
                    className="border border-rhine-gold/50 px-3 py-2 font-mono text-[9px] text-rhine-gold"
                  >
                    提交申诉
                  </button>
                )}
            </div>
          )}
          {!report && !lookupBusy && (
            <p className="mt-4 text-xs leading-relaxed text-rhine-faint">
              工单号格式为 12 位字母数字，提交后请妥善保存。
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
