import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Database,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react'
import {
  adminApi,
  API_BASE,
  errorMessage,
  ROLE_LABELS,
  type AdminOverview,
  type ApiUser,
  type OverviewTimelinePoint,
} from '../../../lib/api'
import { AdminBadge, AdminError } from '../AdminUi'
import { AdminChart } from '../AdminChart'
import type { EChartsOption } from 'echarts'

interface OverviewPanelProps {
  user: ApiUser
  onNavigate?: (key: string) => void
}

const EMPTY_TIMELINE: OverviewTimelinePoint[] = Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - index))
  return {
    date: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    users: 0,
    posts: 0,
    replies: 0,
    messages: 0,
  }
})

const EMPTY_COUNTS: Record<string, number> = {}
const EMPTY_STATUS: Record<string, number> = {}

const CONTENT_ITEMS = [
  { key: 'articles', label: '文章', color: 'var(--color-rhine-gold)' },
  { key: 'photos', label: '照片', color: 'var(--color-rhine-cyan)' },
  { key: 'videos', label: '视频', color: 'var(--color-rhine-green)' },
  { key: 'logs', label: '日志', color: 'var(--color-rhine-gold-deep)' },
] as const

const METRICS = [
  { key: 'posts', label: '帖子', className: 'text-rhine-gold' },
  { key: 'replies', label: '回复', className: 'text-rhine-cyan' },
  { key: 'users', label: '成员', className: 'text-rhine-green' },
  { key: 'messages', label: '留言', className: 'text-rhine-gold-deep' },
] as const

const STATUS_ITEMS = [
  { key: 'pending', label: '待审', className: 'bg-rhine-gold' },
  { key: 'approved', label: '已通过', className: 'bg-rhine-green' },
  { key: 'rejected', label: '已拒绝', className: 'bg-rhine-red' },
  { key: 'hidden', label: '已隐藏', className: 'bg-rhine-line-2' },
  { key: 'deleted', label: '已删除', className: 'bg-rhine-faint' },
] as const

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(reduce ? value : 0)
  const display = useTransform(motionValue, (latest) =>
    Math.round(latest).toLocaleString('zh-CN'),
  )

  useEffect(() => {
    if (reduce) {
      motionValue.set(value)
      return undefined
    }
    const controls = animate(motionValue, value, { duration: 0.9, ease: 'easeOut' })
    return () => controls.stop()
  }, [motionValue, reduce, value])

  return <motion.span>{display}</motion.span>
}

function PanelShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`relative overflow-hidden border border-rhine-line/70 bg-rhine-panel/35 ${className}`}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rhine-gold/50 to-transparent" />
      {children}
    </section>
  )
}

export function OverviewPanel({ user, onNavigate }: OverviewPanelProps) {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking')
  const [metric, setMetric] = useState<(typeof METRICS)[number]['key']>('posts')

  useEffect(() => {
    let alive = true
    adminApi
      .overview()
      .then((next) => {
        if (alive) setData(next)
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
      .then((payload: { ok?: boolean }) => {
        if (alive) setHealth(payload.ok ? 'ok' : 'down')
      })
      .catch(() => {
        if (alive) setHealth('down')
      })
    return () => {
      alive = false
    }
  }, [])

  const counts = data?.counts ?? EMPTY_COUNTS
  const timeline = data?.timeline?.length ? data.timeline : EMPTY_TIMELINE
  const contentTotal = CONTENT_ITEMS.reduce((sum, item) => sum + (counts[item.key] ?? 0), 0)
  const pending = (counts.pendingPosts ?? 0) + (counts.pendingReplies ?? 0)
  const postStatus = data?.postsByStatus ?? EMPTY_STATUS
  const statusTotal = Object.values(postStatus).reduce((sum, value) => sum + value, 0)
  const topBoards = data?.topBoards ?? []
  const roleEntries = Object.entries(data?.usersByRole ?? {})
  const roleTotal = roleEntries.reduce((sum, [, value]) => sum + value, 0)

  const activityOption = useMemo<EChartsOption>(() => {
    const metricLabel = METRICS.find((item) => item.key === metric)?.label ?? ''
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 34, right: 12, top: 20, bottom: 26 },
      xAxis: {
        type: 'category',
        data: timeline.map((point) => point.date),
        axisLine: { lineStyle: { color: 'rgba(140,135,124,.35)' } },
        axisTick: { show: false },
        axisLabel: { color: '#8d887c', fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(140,135,124,.16)' } },
        axisLabel: { color: '#8d887c', fontSize: 9 },
      },
      series: [
        {
          name: metricLabel,
          type: 'line',
          smooth: true,
          symbolSize: 5,
          data: timeline.map((point) => point[metric]),
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.14 },
        },
      ],
    }
  }, [metric, timeline])

  const archiveOption = useMemo<EChartsOption>(() => {
    const items = CONTENT_ITEMS.map((item) => ({
      name: item.label,
      value: counts[item.key] ?? 0,
    })).filter((item) => item.value > 0)
    return {
      title: {
        text: String(contentTotal),
        subtext: 'TOTAL',
        left: 'center',
        top: '38%',
        textStyle: { color: '#d8d3c8', fontSize: 22, fontWeight: 500 },
        subtextStyle: { color: '#77736a', fontSize: 8, letterSpacing: 2 },
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['58%', '80%'],
          center: ['50%', '50%'],
          label: { show: false },
          labelLine: { show: false },
          data: items,
        },
      ],
    }
  }, [contentTotal, counts])

  const statusOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 36, right: 12, top: 16, bottom: 26 },
    xAxis: {
      type: 'category',
      data: STATUS_ITEMS.map((item) => item.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(140,135,124,.35)' } },
      axisLabel: { color: '#8d887c', fontSize: 8 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(140,135,124,.16)' } },
      axisLabel: { color: '#8d887c', fontSize: 9 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        data: STATUS_ITEMS.map((item) => postStatus[item.key] ?? 0),
        itemStyle: { borderRadius: [2, 2, 0, 0] },
      },
    ],
  }), [postStatus])

  const boardsOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 74, right: 20, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(140,135,124,.16)' } },
      axisLabel: { color: '#8d887c', fontSize: 9 },
    },
    yAxis: {
      type: 'category',
      data: [...topBoards].reverse().map((board) => board.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#8d887c', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: [...topBoards].reverse().map((board) => board.count),
        itemStyle: { borderRadius: [0, 2, 2, 0] },
      },
    ],
  }), [topBoards])

  const rolesOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '50%'],
        label: { color: '#8d887c', fontSize: 9, formatter: '{b} {c}' },
        labelLine: { lineStyle: { color: 'rgba(140,135,124,.4)' } },
        data: roleEntries.map(([role, value]) => ({
          name: ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role,
          value,
        })),
      },
    ],
  }), [roleEntries])

  const kpis = [
    {
      key: 'users',
      label: '注册成员',
      en: 'MEMBERS',
      value: counts.users,
      icon: Users,
      target: 'members',
      tone: 'text-rhine-gold',
      line: 'from-rhine-gold/70',
    },
    {
      key: 'posts',
      label: '论坛帖子',
      en: 'THREADS',
      value: counts.posts,
      icon: MessageSquare,
      target: 'forum-public',
      tone: 'text-rhine-cyan',
      line: 'from-rhine-cyan/70',
    },
    {
      key: 'content',
      label: '档案内容',
      en: 'ARCHIVE',
      value: contentTotal,
      icon: Database,
      target: 'articles',
      tone: 'text-rhine-green',
      line: 'from-rhine-green/70',
    },
    {
      key: 'pending',
      label: '待审内容',
      en: 'PENDING',
      value: pending,
      icon: Clock3,
      target: 'review-posts',
      tone: 'text-rhine-red',
      line: 'from-rhine-red/70',
    },
  ]

  return (
    <div className="space-y-4">
      <AdminError message={error} />

      <PanelShell>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rhine-line/50 px-5 py-4">
          <div>
            <p className="font-mono text-[8px] tracking-[0.35em] text-rhine-faint">
              OPERATIONS // COMMAND DECK
            </p>
            <h1 className="mt-1.5 font-display text-lg tracking-[0.12em] text-rhine-ink">
              控制台概览
            </h1>
            <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-rhine-dim">
              {user.username} · {ROLE_LABELS[user.role]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-rhine-green/30 bg-rhine-green/[0.06] px-2 py-1 font-mono text-[9px] text-rhine-green">
              <Activity className="h-3 w-3" />
              {health === 'ok' ? 'SERVER ONLINE' : health === 'down' ? 'SERVER DOWN' : 'CHECKING'}
            </span>
            <AdminBadge tone={user.isSuper ? 'gold' : 'cyan'}>
              {user.isSuper ? 'SUPERUSER' : `${user.permissions.length} PERMS`}
            </AdminBadge>
            <span className="font-mono text-[9px] text-rhine-faint">
              {data?.generatedAt
                ? new Date(data.generatedAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}
            </span>
          </div>
        </div>

        <div className="grid gap-px bg-rhine-line/40 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => item.target && onNavigate?.(item.target)}
                className="group relative bg-rhine-abyss/60 px-4 py-4 text-left transition-colors hover:bg-rhine-panel/60"
              >
                <span
                  className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent ${item.line}`}
                />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] tracking-[0.28em] text-rhine-faint">
                    {item.en}
                  </span>
                  <Icon className={`h-3.5 w-3.5 ${item.tone} opacity-70`} />
                </div>
                <p className={`mt-3 font-display text-3xl leading-none ${item.tone}`}>
                  {item.value === undefined ? '--' : <CountUp value={item.value} />}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-wider text-rhine-dim">
                    {item.label}
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-rhine-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            )
          })}
        </div>
      </PanelShell>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <PanelShell>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                <BarChart3 className="h-3 w-3" /> ACTIVITY // 7 DAYS
              </p>
              <p className="mt-1 font-mono text-[10px] text-rhine-dim">近 7 天社区活跃度</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {METRICS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMetric(item.key)}
                  className={`border px-2 py-1 font-mono text-[9px] tracking-wider transition-colors ${
                    metric === item.key
                      ? 'border-rhine-gold/50 bg-rhine-gold/10 text-rhine-gold'
                      : 'border-rhine-line/60 text-rhine-faint hover:text-rhine-dim'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-5">
            <AdminChart
              option={activityOption}
              height={210}
              empty={timeline.every((point) => point[metric] === 0)}
            />
          </div>
        </PanelShell>

        <PanelShell>
          <div className="border-b border-rhine-line/50 px-5 py-4">
            <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
              <Database className="h-3 w-3" /> ARCHIVE MIX
            </p>
            <p className="mt-1 font-mono text-[10px] text-rhine-dim">档案内容分布</p>
          </div>
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-[170px_1fr] sm:items-center">
            <AdminChart option={archiveOption} height={170} empty={contentTotal === 0} />
            <div className="w-full space-y-2">
              {CONTENT_ITEMS.map((item) => {
                const value = counts[item.key] ?? 0
                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="h-2 w-2" style={{ backgroundColor: item.color }} />
                    <span className="flex-1 font-mono text-[10px] text-rhine-dim">{item.label}</span>
                    <span className="font-mono text-[10px] text-rhine-ink">{value}</span>
                    <span className="w-9 text-right font-mono text-[9px] text-rhine-faint">
                      {Math.round((value / Math.max(contentTotal, 1)) * 100)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="border-t border-rhine-line/50 px-5 py-3">
            <div className="flex items-center justify-between font-mono text-[9px] tracking-wider text-rhine-faint">
              <span>待审队列</span>
              <span className={pending > 0 ? 'text-rhine-red' : 'text-rhine-green'}>
                {pending > 0 ? `${pending} ITEMS` : 'CLEAR'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('review-posts')}
              className="mt-2 flex w-full items-center justify-between border border-rhine-gold/25 bg-rhine-gold/[0.05] px-3 py-2 text-left font-mono text-[10px] text-rhine-gold transition-colors hover:bg-rhine-gold/10"
            >
              进入内容审核
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </PanelShell>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelShell>
          <div className="flex items-center justify-between border-b border-rhine-line/50 px-5 py-4">
            <div>
              <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
                <ShieldCheck className="h-3 w-3" /> MODERATION
              </p>
              <p className="mt-1 font-mono text-[10px] text-rhine-dim">帖子状态</p>
            </div>
            <span className="font-mono text-[9px] text-rhine-faint">{statusTotal} POSTS</span>
          </div>
          <div className="px-5 py-4">
            <AdminChart option={statusOption} height={190} empty={statusTotal === 0} />
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STATUS_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 ${item.className}`} />
                  <span className="font-mono text-[9px] text-rhine-faint">{item.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-rhine-ink">
                    {postStatus[item.key] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PanelShell>

        <PanelShell>
          <div className="border-b border-rhine-line/50 px-5 py-4">
            <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-rhine-faint">
              <Users className="h-3 w-3" /> RANKING
            </p>
            <p className="mt-1 font-mono text-[10px] text-rhine-dim">板块发帖量</p>
          </div>
          <div className="px-5 py-4">
            <AdminChart
              option={boardsOption}
              height={Math.max(170, topBoards.length * 32)}
              empty={topBoards.length === 0}
            />
          </div>
          {roleTotal > 0 && (
            <div className="border-t border-rhine-line/50 px-5 py-3">
              <div className="mb-1 flex items-center justify-between font-mono text-[9px] tracking-wider text-rhine-faint">
                <span>成员角色</span>
                <span>{roleTotal}</span>
              </div>
              <AdminChart option={rolesOption} height={150} />
            </div>
          )}
        </PanelShell>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-rhine-line/50 bg-rhine-panel/20 px-4 py-3 font-mono text-[9px] tracking-wider text-rhine-faint">
        <span className="flex items-center gap-2">
          <Activity className="h-3 w-3" />
        </span>
        <span className="flex items-center gap-3">
          <span>ROLE: {ROLE_LABELS[user.role]}</span>
          <span className="text-rhine-faint">//</span>
          <span className={health === 'ok' ? 'text-rhine-green' : 'text-rhine-red'}>
            {health === 'ok' ? 'CONNECTED' : health === 'down' ? 'DISCONNECTED' : 'CHECKING'}
          </span>
        </span>
      </div>
    </div>
  )
}
