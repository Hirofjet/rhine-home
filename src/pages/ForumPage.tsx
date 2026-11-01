import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Lock, MessageSquare, Plus, Radio, Search, Shield } from 'lucide-react'
import {
  errorMessage,
  forumApi,
  type Announcement,
  type Board,
} from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { ForumAuthModal } from '../components/forum/ForumAuthModal'
import { fadeUp, stagger } from '../lib/motion'
import { formatDateTime } from '../lib/format'

const ACCESS_LABEL: Record<string, string> = {
  public: '公开',
  special: '特殊',
  core: '核心',
}

const ACCESS_TONE: Record<string, string> = {
  public: 'border-rhine-line text-rhine-faint',
  special: 'border-rhine-cyan/50 text-rhine-cyan',
  core: 'border-rhine-gold/50 text-rhine-gold',
}

export function ForumPage() {
  const { user } = useSession()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [search, setSearch] = useState('')
  const [applying, setApplying] = useState<number | null>(null)

  const load = async () => {
    const data = await forumApi.boards()
    setBoards(data.boards)
  }

  useEffect(() => {
    let alive = true
    forumApi
      .boards()
      .then((data) => {
        if (alive) setBoards(data.boards)
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    forumApi
      .announcements()
      .then((data) => {
        if (alive) setAnnouncements(data.announcements)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const applyAccess = async (board: Board) => {
    if (!user) {
      setAuthOpen(true)
      return
    }
    setApplying(board.id)
    setError('')
    try {
      await forumApi.requestAccess(board.id)
      setBoards((current) =>
        current.map((item) =>
          item.id === board.id ? { ...item, requestStatus: 'pending' } : item,
        ),
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setApplying(null)
    }
  }

  const totalPosts = boards.reduce((sum, board) => sum + board.postCount, 0)
  const filteredBoards = boards.filter((board) => {
    if (!search.trim()) return true
    const keyword = search.trim().toLowerCase()
    return (
      board.name.toLowerCase().includes(keyword) ||
      board.slug.toLowerCase().includes(keyword) ||
      board.description.toLowerCase().includes(keyword)
    )
  })

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-24 pt-28 sm:px-6">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.p
          variants={fadeUp}
          className="font-mono text-xs tracking-[0.3em] text-rhine-faint"
        >
          RHINE//FORUM
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="text-glow-gold mt-3 text-4xl font-bold text-rhine-ink sm:text-5xl"
        >
          论坛
          <span className="ml-3 font-mono text-sm tracking-[0.3em] text-rhine-faint">
            / FORUM
          </span>
        </motion.h1>

        {announcements.length > 0 && (
          <motion.div variants={fadeUp} className="mt-5 space-y-2">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="border border-rhine-gold/30 bg-rhine-gold/[0.04] px-4 py-2.5"
              >
                <p className="font-mono text-[10px] tracking-[0.16em] text-rhine-gold">
                  公告 · {item.title}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-rhine-dim">
                  {item.content}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          className="mt-5 flex flex-wrap items-center gap-4 border-y border-rhine-line/60 py-3 font-mono text-[10px] tracking-[0.2em] text-rhine-faint"
        >
          <span className="flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-rhine-green" /> ONLINE
          </span>
          <span>BOARDS: {String(boards.length).padStart(2, '0')}</span>
          <span>THREADS: {String(totalPosts).padStart(3, '0')}</span>
          <span>ACCESS: {user ? 'AUTHENTICATED' : 'GUEST'}</span>
        </motion.div>
      </motion.div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex min-w-56 flex-1 items-center gap-2 border border-rhine-line/60 bg-rhine-abyss/40 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-rhine-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索板块"
            className="w-full bg-transparent font-mono text-xs text-rhine-ink outline-none placeholder:text-rhine-faint"
          />
        </div>
        {user ? (
          <Link
            to="/forum/new"
            className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-rhine-gold transition-colors hover:bg-rhine-gold/20"
          >
            <Plus className="h-3 w-3" /> 发布新帖
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-rhine-gold"
          >
            登录 / 注册
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] text-rhine-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          LOADING BOARDS …
        </p>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-5 grid gap-3 sm:grid-cols-2"
        >
          {filteredBoards.map((board) => {
            const accessible = board.canAccess !== false
            const isSpecial = board.access === 'special'
            const isCore = board.access === 'core'
            const pending = board.requestStatus === 'pending'
            return (
              <motion.div key={board.id} variants={fadeUp}>
                <div className="relative flex h-full flex-col border border-rhine-line/80 bg-rhine-panel/50 p-4 transition-colors hover:border-rhine-gold/40">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.16em] ${ACCESS_TONE[board.access] ?? ACCESS_TONE.public}`}
                    >
                      {ACCESS_LABEL[board.access] ?? '公开'}
                    </span>
                    {accessible ? (
                      <Link
                        to={`/forum/${board.slug}`}
                        className="font-mono text-[10px] tracking-[0.16em] text-rhine-cyan hover:text-rhine-gold"
                      >
                        进入 →
                      </Link>
                    ) : (
                      <Lock className="h-3 w-3 text-rhine-faint" />
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-rhine-ink">{board.name}</h2>
                  <p className="mt-1 min-h-9 text-xs leading-relaxed text-rhine-dim">
                    {board.description || '暂无描述'}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 font-mono text-[10px] tracking-wider text-rhine-faint">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> {board.postCount} 主题
                    </span>
                    <span>{board.lastPostAt ? formatDateTime(board.lastPostAt) : '暂无帖子'}</span>
                  </div>

                  {!accessible && (
                    <div className="mt-3 border-t border-rhine-line/50 pt-2">
                      {isCore ? (
                        <p className="flex items-center gap-1.5 font-mono text-[10px] text-rhine-gold">
                          <Shield className="h-3 w-3" /> 核心板块 · 仅授权成员可访问
                        </p>
                      ) : isSpecial ? (
                        pending ? (
                          <p className="font-mono text-[10px] text-rhine-cyan">访问申请审核中</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void applyAccess(board)}
                            disabled={applying === board.id}
                            className="border border-rhine-cyan/50 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-rhine-cyan hover:bg-rhine-cyan/10 disabled:opacity-50"
                          >
                            {applying === board.id ? '提交中…' : '申请访问'}
                          </button>
                        )
                      ) : (
                        <Link
                          to={`/forum/${board.slug}`}
                          className="font-mono text-[10px] text-rhine-gold"
                        >
                          进入 →
                        </Link>
                      )}
                    </div>
                  )}
                  {accessible && (
                    <Link
                      to={`/forum/${board.slug}`}
                      className="mt-3 inline-flex items-center gap-1 border-t border-rhine-line/50 pt-2 font-mono text-[10px] text-rhine-dim hover:text-rhine-gold"
                    >
                      查看帖子 <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </motion.div>
            )
          })}
          {filteredBoards.length === 0 && (
            <p className="border border-rhine-line/60 bg-rhine-panel/30 px-4 py-6 text-center font-mono text-[11px] text-rhine-faint">
              没有匹配的板块
            </p>
          )}
        </motion.div>
      )}

      <ForumAuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => void load()} />
    </section>
  )
}
