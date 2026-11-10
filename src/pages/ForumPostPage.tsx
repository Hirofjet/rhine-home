import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, EyeOff, MessageSquare, Pin, Trash2, User } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  forumApi,
  hasPerm,
  resolveMediaUrl,
  userApi,
  type ForumPost,
  type ForumReply,
} from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { ForumAuthModal } from '../components/forum/ForumAuthModal'
import { AuthorTitle } from '../components/forum/AuthorTitle'
import { ReportDialog } from '../components/safety/ReportDialog'
import { AttachmentGrid } from '../components/forum/AttachmentGrid'
import { ContentComposer, type ComposerValue } from '../components/forum/ContentComposer'
import { fadeUp, stagger } from '../lib/motion'
import { formatDateTime } from '../lib/format'

export function ForumPostPage() {
  const { id = '0' } = useParams()
  const postId = Number(id)
  const navigate = useNavigate()
  const { user } = useSession()
  const [post, setPost] = useState<ForumPost | null>(null)
  const [replies, setReplies] = useState<ForumReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [value, setValue] = useState<ComposerValue>({ content: '', attachments: [] })
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [parent, setParent] = useState<ForumReply | null>(null)
  const [followingAuthor, setFollowingAuthor] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  const loadPost = async () => {
    const data = await forumApi.post(postId)
    setPost(data.post)
    setReplies(data.replies)
  }

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

  useEffect(() => {
    if (!user || !post || user.id === post.authorId) {
      setFollowingAuthor(false)
      return
    }
    let alive = true
    userApi
      .profile(post.authorId)
      .then((data) => {
        if (alive) setFollowingAuthor(Boolean(data.user.isFollowing))
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [post?.authorId, user?.id])

  const toggleFollowAuthor = async () => {
    if (!post || !user || followBusy || user.id === post.authorId) return
    setFollowBusy(true)
    try {
      if (followingAuthor) await userApi.unfollow(post.authorId)
      else await userApi.follow(post.authorId)
      setFollowingAuthor((value) => !value)
      setNotice(followingAuthor ? '已取消关注作者' : '已关注作者')
    } catch {
      setNotice('关注失败，请稍后再试')
    } finally {
      setFollowBusy(false)
    }
  }

  const canModerate = Boolean(user && post && hasPerm(user, `forum.${post.board.id}`))
  const canDeletePost = Boolean(user && post && (user.id === post.authorId || canModerate))
  const canDeleteReply = (reply: ForumReply) =>
    Boolean(user && post && (user.id === reply.authorId || user.id === post.authorId || canModerate))

  const removePost = async () => {
    if (!post) return
    if (!window.confirm('删除这个帖子？')) return
    try {
      await forumApi.deletePost(postId)
      navigate(`/forum/${post.board.slug}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const moderate = async (action: 'hide' | 'pin' | 'unpin' | 'restore') => {
    if (!post) return
    try {
      await adminApi.moderatePost(postId, action)
      if (action === 'hide') {
        navigate(`/forum/${post.board.slug}`)
        return
      }
      await loadPost()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const removeReply = async (reply: ForumReply) => {
    if (!window.confirm('删除这条回复？')) return
    try {
      await forumApi.deleteReply(reply.id)
      setReplies((current) => current.filter((item) => item.id !== reply.id))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const submitReply = async () => {
    if (!user) {
      setAuthOpen(true)
      return
    }
    if (!value.content.trim() && value.attachments.length === 0) {
      setError('回复内容不能为空')
      return
    }
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const result = await forumApi.reply(postId, { ...value, parentId: parent?.id ?? null })
      setNotice(result.message || '回复已发布')
      setValue({ content: '', attachments: [] })
      setParent(null)
      await loadPost()
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
          <Link
            to={`/u/${post.authorId}`}
            title="查看作者资料并关注"
            className="flex items-center gap-2 text-rhine-cyan hover:text-rhine-gold"
          >
            {post.authorAvatar ? (
              <img
                src={resolveMediaUrl(post.authorAvatar)}
                alt={post.author}
                className="h-7 w-7 rounded-full border border-rhine-line object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rhine-line bg-rhine-abyss text-rhine-gold">
                <User className="h-3 w-3" />
              </span>
            )}
            <span>{post.author}</span>
            <span className="border border-rhine-line px-1 py-0.5 text-[8px] text-rhine-faint">资料</span>
          </Link>
          <AuthorTitle title={post.authorTitle} level={post.authorLevel} />
          {user && user.id !== post.authorId && (
            <button
              type="button"
              onClick={() => void toggleFollowAuthor()}
              disabled={followBusy}
              className={`border px-2 py-1 font-mono text-[9px] tracking-wider ${
                followingAuthor
                  ? 'border-rhine-line text-rhine-dim'
                  : 'border-rhine-gold/50 bg-rhine-gold/10 text-rhine-gold'
              }`}
            >
              {followBusy ? '处理中…' : followingAuthor ? '已关注作者' : '+ 关注作者'}
            </button>
          )}
          <span>{formatDateTime(post.createdAt)}</span>
          {post.pinned && (
            <span className="flex items-center gap-1 border border-rhine-gold/40 px-1.5 py-0.5 text-rhine-gold">
              <Pin className="h-2.5 w-2.5" /> 置顶
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <ReportDialog
              targetType="post"
              targetId={post.id}
              targetLabel={post.title}
              className="font-mono text-[9px] text-rhine-faint hover:text-rhine-red"
            />
            <MessageSquare className="h-3 w-3" /> {replies.length} 回复
          </span>
        </motion.div>

        {(Array.isArray(post.tags) ? post.tags : []).length > 0 && (
          <motion.div variants={fadeUp} className="mt-2 flex flex-wrap gap-2">
            {(Array.isArray(post.tags) ? post.tags : []).map((tag) => (
              <span key={tag} className="border border-rhine-line/70 px-2 py-0.5 font-mono text-[10px] text-rhine-cyan">
                #{tag}
              </span>
            ))}
          </motion.div>
        )}

        {(canDeletePost || canModerate) && (
          <motion.div variants={fadeUp} className="mt-3 flex flex-wrap gap-2">
            {canModerate && (
              <>
                <button
                  type="button"
                  onClick={() => void moderate(post.pinned ? 'unpin' : 'pin')}
                  className="inline-flex items-center gap-1 border border-rhine-gold/50 px-2 py-1 font-mono text-[10px] text-rhine-gold hover:bg-rhine-gold/10"
                >
                  <Pin className="h-3 w-3" /> {post.pinned ? '取消置顶' : '置顶'}
                </button>
                <button
                  type="button"
                  onClick={() => void moderate('hide')}
                  className="inline-flex items-center gap-1 border border-rhine-line px-2 py-1 font-mono text-[10px] text-rhine-dim hover:border-rhine-red/50 hover:text-rhine-red"
                >
                  <EyeOff className="h-3 w-3" /> 隐藏
                </button>
              </>
            )}
            {canDeletePost && (
              <button
                type="button"
                onClick={() => void removePost()}
                className="inline-flex items-center gap-1 border border-rhine-red/40 px-2 py-1 font-mono text-[10px] text-rhine-red hover:bg-rhine-red/10"
              >
                <Trash2 className="h-3 w-3" /> 删除帖子
              </button>
            )}
          </motion.div>
        )}

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
            {replies.map((reply) => {
              const parentReply = reply.parentId
                ? replies.find((item) => item.id === reply.parentId)
                : null
              return (
                <li
                  key={reply.id}
                  className="border border-rhine-line/60 bg-rhine-panel/30 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] tracking-wider text-rhine-faint">
                    <Link
                      to={`/u/${reply.authorId}`}
                      className="text-rhine-cyan hover:text-rhine-gold"
                      title="查看回复作者资料"
                    >
                      {reply.author}
                    </Link>
                    <AuthorTitle title={reply.authorTitle} level={reply.authorLevel} />
                    <span>{formatDateTime(reply.createdAt)}</span>
                    <ReportDialog
                      targetType="reply"
                      targetId={reply.id}
                      targetLabel={`回复：${reply.content.slice(0, 80)}`}
                      className="ml-auto font-mono text-[9px] text-rhine-faint hover:text-rhine-red"
                    />
                    {user && (
                      <span className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setParent(reply)}
                          className="text-rhine-faint hover:text-rhine-gold"
                        >
                          回复
                        </button>
                        {canDeleteReply(reply) && (
                          <button
                            type="button"
                            onClick={() => void removeReply(reply)}
                            className="text-rhine-faint hover:text-rhine-red"
                          >
                            删除
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  {parentReply && (
                    <p className="mt-1 border-l-2 border-rhine-gold/40 pl-2 font-mono text-[10px] text-rhine-faint">
                      回复 @{parentReply.author}：{parentReply.content.slice(0, 60)}
                    </p>
                  )}
                  <div className="md-body mt-2 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{reply.content}</ReactMarkdown>
                  </div>
                  <AttachmentGrid attachments={reply.attachments} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-8 border border-rhine-line/70 bg-rhine-panel/30 p-4">
        <p className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
          发表回复
        </p>
        {user ? (
          <div className="mt-3">
            {parent && (
              <p className="mb-2 flex items-center justify-between border border-rhine-gold/30 bg-rhine-gold/5 px-2 py-1 font-mono text-[10px] text-rhine-gold">
                回复 @{parent.author}
                <button type="button" onClick={() => setParent(null)} className="text-rhine-faint">
                  取消
                </button>
              </p>
            )}
            <ContentComposer
              value={value}
              onChange={setValue}
              onSubmit={() => void submitReply()}
              submitting={submitting}
              submitLabel="发表回复"
              placeholder="回复内容，可插入图片或 GIF 表情"
              compact
              imagesOnly
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
              登录 / 注册
            </button>
          </div>
        )}
      </div>

      <ForumAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
