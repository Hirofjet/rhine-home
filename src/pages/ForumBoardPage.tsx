import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageSquare, Pin, Plus, Search, User } from 'lucide-react'
import {
  errorMessage,
  forumApi,
  resolveMediaUrl,
  type Announcement,
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [search, setSearch] = useState('')

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
  const filtered = posts.filter((post) => {
    if (!search.trim()) return true
    const keyword = search.trim().toLowerCase()
    return (
      post.title.toLowerCase().includes(keyword) ||
      post.author.toLowerCase().includes(keyword) ||
      (post.tags ?? []).some((tag) => tag.toLowerCase().includes(keyword))
    )
  })

  useEffect(() => {
    if (!board) return undefined
    let alive = true
    forumApi
      .announcements(board.id)
      .then((data) => {
        if (alive) setAnnouncements(data.announcements)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [board])

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

      {announcements.length > 0 && (
        <div className="mt-5 space-y-2">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="border border-rhine-gold/30 bg-rhine-gold/[0.04] px-4 py-3"
            >
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-rhine-gold">
                <Pin className="h-3 w-3" /> 公告 · {item.title}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-rhine-dim">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 border border-rhine-line/60 bg-rhine-abyss/40 px-3 py-2">
        <Search className="h-3.5 w-3.5 text-rhine-faint" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索标题、作者或标签"
          className="w-full bg-transparent font-mono text-xs text-rhine-ink outline-none placeholder:text-rhine-faint"
        />
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
      ) : filtered.length === 0 ? (
        <p className="mt-10 border border-rhine-line/60 bg-rhine-panel/30 px-4 py-8 text-center font-mono text-[11px] tracking-wider text-rhine-faint">
          没有匹配的帖子。
        </p>
      ) : (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-5 divide-y divide-rhine-line/60 border border-rhine-line/70 bg-rhine-panel/30"
        >
          {filtered.map((post) => (
            <motion.li key={post.id} variants={fadeUp}>
              <Link
                to={`/forum/post/${post.id}`}
                className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-rhine-gold/[0.04]"
              >
                {post.authorAvatar ? (
                  <img
                    src={resolveMediaUrl(post.authorAvatar)}
                    alt={post.author}
                    className="h-8 w-8 rounded-full border border-rhine-line object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rhine-line bg-rhine-abyss font-mono text-[10px] text-rhine-gold">
                    {post.author.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm text-rhine-ink group-hover:text-rhine-gold">
                    {post.pinned && <Pin className="h-3 w-3 shrink-0 text-rhine-gold" />}
                    {post.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[9px] tracking-wider text-rhine-faint">
                    <span className="flex items-center gap-1">
                      <User className="h-2.5 w-2.5" /> {post.author}
                    </span>
                    <span>{formatDateTime(post.createdAt)}</span>
                    {(post.tags ?? []).map((tag) => (
                      <span key={tag} className="border border-rhine-line/70 px-1.5 py-0.5 text-rhine-cyan">
                        #{tag}
                      </span>
                    ))}
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
