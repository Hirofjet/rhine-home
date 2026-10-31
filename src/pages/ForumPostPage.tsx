import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Loader2, MessageSquare, User } from 'lucide-react'
import {
  errorMessage,
  forumApi,
  type ForumPost,
  type ForumReply,
} from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { ForumAuthModal } from '../components/forum/ForumAuthModal'
import { AttachmentGrid } from '../components/forum/AttachmentGrid'
import { ContentComposer, type ComposerValue } from '../components/forum/ContentComposer'
import { fadeUp, stagger } from '../lib/motion'
import { formatDateTime } from '../lib/format'

export function ForumPostPage() {
  const { id = '0' } = useParams()
  const postId = Number(id)
  const { user } = useSession()
  const [post, setPost] = useState<ForumPost | null>(null)
  const [replies, setReplies] = useState<ForumReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [value, setValue] = useState<ComposerValue>({ content: '', attachments: [] })
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let alive = true
    forumApi
      .post(postId)
      .then((data) => {
        if (!alive) return
        setPost(data.post)
        setReplies(data.replies)
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
  }, [postId])

  const submitReply = async () => {
    if (!user) {
      setAuthOpen(true)
      return
    }
    if (!value.content.trim()) {
      setError('回复内容不能为空')
      return
    }
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await forumApi.reply(postId, value)
      setNotice('回复已提交，审核通过后展示')
      setValue({ content: '', attachments: [] })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          LOADING THREAD …
        </p>
      </section>
    )
  }

  if (error || !post) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <Link
          to="/forum"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint hover:text-rhine-gold"
        >
          <ArrowLeft className="h-3 w-3" /> 返回论坛
        </Link>
        <p className="mt-6 border border-rhine-red/40 bg-rhine-red/5 px-4 py-3 font-mono text-[11px] text-rhine-red">
          {error || '帖子不存在或尚未过审'}
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
      <Link
        to={`/forum/${post.board.slug}`}
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint transition-colors hover:text-rhine-gold"
      >
        <ArrowLeft className="h-3 w-3" /> {post.board.name}
      </Link>

      <motion.article
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mt-5 border border-rhine-line/70 bg-rhine-panel/40 p-5 sm:p-6"
      >
        <motion.p
          variants={fadeUp}
          className="font-mono text-[9px] tracking-[0.3em] text-rhine-faint"
        >
          THREAD // {post.board.slug.toUpperCase()}
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="mt-2 text-2xl font-bold leading-snug text-rhine-ink sm:text-3xl"
        >
          {post.title}
        </motion.h1>
        <motion.div
          variants={fadeUp}
          className="mt-3 flex flex-wrap items-center gap-3 border-b border-rhine-line/60 pb-3 font-mono text-[10px] tracking-wider text-rhine-faint"
        >
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {post.author}
          </span>
          <span>{formatDateTime(post.createdAt)}</span>
          <span className="ml-auto flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {replies.length} 回复
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="md-body mt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </motion.div>
        <AttachmentGrid attachments={post.attachments} />
      </motion.article>

      <div className="mt-8">
        <p className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
          回复 / REPLIES
        </p>
        {replies.length === 0 ? (
          <p className="mt-3 border border-rhine-line/60 bg-rhine-panel/20 px-4 py-5 font-mono text-[10px] tracking-wider text-rhine-faint">
            还没有回复。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {replies.map((reply) => (
              <li
                key={reply.id}
                className="border border-rhine-line/60 bg-rhine-panel/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] tracking-wider text-rhine-faint">
                  <span className="text-rhine-cyan">{reply.author}</span>
                  <span>{formatDateTime(reply.createdAt)}</span>
                </div>
                <div className="md-body mt-2 text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{reply.content}</ReactMarkdown>
                </div>
                <AttachmentGrid attachments={reply.attachments} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 border border-rhine-line/70 bg-rhine-panel/30 p-4">
        <p className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
          发表回复
        </p>
        {user ? (
          <div className="mt-3">
            <ContentComposer
              value={value}
              onChange={setValue}
              onSubmit={() => void submitReply()}
              submitting={submitting}
              submitLabel="提交回复（需审核）"
              placeholder="写下你的回复…"
              compact
            />
            {notice && (
              <p className="mt-3 border border-rhine-green/40 bg-rhine-green/5 px-3 py-2 font-mono text-[10px] text-rhine-green">
                {notice}
              </p>
            )}
            {error && (
              <p className="mt-3 border border-rhine-red/40 bg-rhine-red/5 px-3 py-2 font-mono text-[10px] text-rhine-red">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10px] tracking-wider text-rhine-dim">
              登录后即可回复
            </p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-2 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rhine-gold transition-colors hover:bg-rhine-gold/20"
            >
              <Loader2 className="hidden" /> 登录 / 注册
            </button>
          </div>
        )}
      </div>

      <ForumAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
