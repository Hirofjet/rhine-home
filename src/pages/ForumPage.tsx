import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageSquare, Plus, Radio } from 'lucide-react'
import { errorMessage, forumApi, ROLE_LABELS, type Board } from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { ForumAuthModal } from '../components/forum/ForumAuthModal'
import { fadeUp, stagger } from '../lib/motion'
import { formatDateTime, STATUS_LABELS, STATUS_STYLES } from '../lib/format'

interface MineData {
  posts: Array<{
    id: number
    title: string
    status: string
    createdAt: string
    board: { slug: string; name: string }
  }>
  replies: Array<{
    id: number
    content: string
    status: string
    createdAt: string
    post: { id: number; title: string }
  }>
}

export function ForumPage() {
  const { user, logout } = useSession()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [mine, setMine] = useState<MineData | null>(null)

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
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined
    let alive = true
    forumApi
      .my()
      .then((data) => {
        if (alive) setMine(data)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [user])

  const totalPosts = boards.reduce((sum, board) => sum + board.postCount, 0)

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-24 pt-28 sm:px-6">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.p
          variants={fadeUp}
          className="font-mono text-xs tracking-[0.3em] text-rhine-faint"
        >
          RHINE//FORUM // 公共讨论区
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="text-glow-gold mt-3 text-4xl font-bold text-rhine-ink sm:text-5xl"
        >
          论坛<span className="ml-3 font-mono text-sm tracking-[0.3em] text-rhine-faint">/ FORUM</span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-rhine-dim"
        >
          注册用户可发布帖子、图片、视频与文章，所有内容经论坛管理员审核后公开。
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-6 flex flex-wrap items-center gap-4 border-y border-rhine-line/60 py-3 font-mono text-[10px] tracking-[0.2em] text-rhine-faint"
        >
          <span className="flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-rhine-green" /> SYSTEM ONLINE
          </span>
          <span>BOARDS: {String(boards.length).padStart(2, '0')}</span>
          <span>THREADS: {String(totalPosts).padStart(3, '0')}</span>
          <span>ACCESS: {user ? 'AUTHENTICATED' : 'GUEST'}</span>
        </motion.div>
      </motion.div>

      {error && (
        <p className="mt-6 border border-rhine-red/40 bg-rhine-red/5 px-4 py-3 font-mono text-[11px] tracking-wider text-rhine-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-10 animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          LOADING BOARDS …
        </p>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-8 grid gap-4 sm:grid-cols-2"
        >
          {boards.map((board) => (
            <motion.div key={board.id} variants={fadeUp}>
              <Link
                to={`/forum/${board.slug}`}
                className="group relative flex h-full flex-col border border-rhine-line/80 bg-rhine-panel/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-rhine-gold/50 hover:shadow-[0_0_34px_rgb(211_178_122/0.14)]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rhine-gold/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] tracking-[0.3em] text-rhine-faint">
                    BOARD // {board.slug.toUpperCase()}
                  </p>
                  <ArrowRight className="h-4 w-4 text-rhine-faint transition-all group-hover:translate-x-1 group-hover:text-rhine-gold" />
                </div>
                <h2 className="mt-3 text-lg font-semibold text-rhine-ink group-hover:text-rhine-gold">
                  {board.name}
                </h2>
                <p className="mt-2 min-h-10 text-xs leading-relaxed text-rhine-dim">
                  {board.description || '暂无描述'}
                </p>
                <div className="mt-auto flex items-center justify-between pt-4 font-mono text-[10px] tracking-wider text-rhine-faint">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" /> {board.postCount} 主题
                  </span>
                  <span>{board.lastPostAt ? formatDateTime(board.lastPostAt) : '暂无帖子'}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-rhine-line/70 bg-rhine-panel/40 px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.16em] text-rhine-dim">
          {user
            ? `已登录：${user.username}（${ROLE_LABELS[user.role]}）`
            : '登录后即可发帖、回复与上传图片 / 视频'}
        </p>
        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/forum/new"
              className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20"
            >
              <Plus className="h-3 w-3" /> 发布新帖
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 border border-rhine-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-rhine-dim transition-colors hover:border-rhine-red/50 hover:text-rhine-red"
            >
              退出
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20"
          >
            登录 / 注册
          </button>
        )}
      </div>

      {user && mine && (mine.posts.length > 0 || mine.replies.length > 0) && (
        <div className="mt-10 border border-rhine-line/70 bg-rhine-panel/30">
          <div className="flex items-center justify-between border-b border-rhine-line/60 px-4 py-3">
            <p className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
              我的发布 / MY SUBMISSIONS
            </p>
            <span className="font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
              审核通过后才会公开
            </span>
          </div>
          <ul className="divide-y divide-rhine-line/50">
            {mine.posts.map((post) => (
              <li key={`post-${post.id}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <Link
                  to={`/forum/post/${post.id}`}
                  className="min-w-0 flex-1 truncate text-xs text-rhine-ink hover:text-rhine-gold"
                >
                  {post.title}
                </Link>
                <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                  {post.board.name}
                </span>
                <span
                  className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-wider ${
                    STATUS_STYLES[post.status] ?? 'border-rhine-line text-rhine-faint'
                  }`}
                >
                  {STATUS_LABELS[post.status] ?? post.status}
                </span>
              </li>
            ))}
            {mine.replies.map((reply) => (
              <li key={`reply-${reply.id}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <Link
                  to={`/forum/post/${reply.post.id}`}
                  className="min-w-0 flex-1 truncate text-xs text-rhine-dim hover:text-rhine-gold"
                >
                  回复：{reply.content.slice(0, 40) || '（无文字）'}
                </Link>
                <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                  {reply.post.title}
                </span>
                <span
                  className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-wider ${
                    STATUS_STYLES[reply.status] ?? 'border-rhine-line text-rhine-faint'
                  }`}
                >
                  {STATUS_LABELS[reply.status] ?? reply.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ForumAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
