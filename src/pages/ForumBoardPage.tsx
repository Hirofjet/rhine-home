import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageSquare, Plus, User } from 'lucide-react'
import {
  errorMessage,
  forumApi,
  type Board,
  type PostSummary,
} from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { ForumAuthModal } from '../components/forum/ForumAuthModal'
import { fadeUp, stagger } from '../lib/motion'
import { formatDateTime } from '../lib/format'

export function ForumBoardPage() {
  const { slug = '' } = useParams()
  const { user } = useSession()
  const [board, setBoard] = useState<Board | null>(null)
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    let alive = true
    forumApi
      .board(slug, page)
      .then((data) => {
        if (!alive) return
        setBoard(data.board)
        setPosts(data.posts)
        setTotal(data.pagination.total)
        setError('')
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
  }, [slug, page])

  const pageCount = Math.max(1, Math.ceil(total / 12))

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint transition-colors hover:text-rhine-gold"
      >
        <ArrowLeft className="h-3 w-3" /> 返回论坛
      </Link>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mt-4"
      >
        <motion.p variants={fadeUp} className="font-mono text-[10px] tracking-[0.3em] text-rhine-faint">
          BOARD // {slug.toUpperCase()}
        </motion.p>
        <motion.h1 variants={fadeUp} className="mt-2 text-3xl font-bold text-rhine-ink sm:text-4xl">
          {board?.name ?? '板块'}
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-2 text-sm text-rhine-dim">
          {board?.description || '暂无描述'}
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="mt-4 flex flex-wrap items-center gap-4 border-y border-rhine-line/60 py-3 font-mono text-[10px] tracking-[0.2em] text-rhine-faint"
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" /> {total} 主题
          </span>
          <span>PAGE {page} / {pageCount}</span>
        </motion.div>
      </motion.div>

      <div className="mt-5 flex justify-end">
        {user ? (
          <Link
            to={`/forum/new?board=${encodeURIComponent(slug)}`}
            className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20"
          >
            <Plus className="h-3 w-3" /> 发布新帖
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20"
          >
            登录后发帖
          </button>
        )}
      </div>

      {error && (
        <p className="mt-6 border border-rhine-red/40 bg-rhine-red/5 px-4 py-3 font-mono text-[11px] text-rhine-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-10 animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          LOADING THREADS …
        </p>
      ) : posts.length === 0 ? (
        <p className="mt-10 border border-rhine-line/60 bg-rhine-panel/30 px-4 py-8 text-center font-mono text-[11px] tracking-wider text-rhine-faint">
          还没有帖子，来发第一帖吧。
        </p>
      ) : (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-5 divide-y divide-rhine-line/60 border border-rhine-line/70 bg-rhine-panel/30"
        >
          {posts.map((post) => (
            <motion.li key={post.id} variants={fadeUp}>
              <Link
                to={`/forum/post/${post.id}`}
                className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-rhine-gold/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-rhine-ink group-hover:text-rhine-gold">
                    {post.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[9px] tracking-wider text-rhine-faint">
                    <span className="flex items-center gap-1">
                      <User className="h-2.5 w-2.5" /> {post.author}
                    </span>
                    <span>{formatDateTime(post.createdAt)}</span>
                  </div>
                </div>
                <span className="flex items-center gap-1 font-mono text-[10px] text-rhine-dim">
                  <MessageSquare className="h-3 w-3" /> {post.replyCount}
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="border border-rhine-line px-3 py-1.5 transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold disabled:opacity-40"
          >
            ← 上一页
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={page >= pageCount}
            className="border border-rhine-line px-3 py-1.5 transition-colors hover:border-rhine-gold/60 hover:text-rhine-gold disabled:opacity-40"
          >
            下一页 →
          </button>
        </div>
      )}

      <ForumAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
