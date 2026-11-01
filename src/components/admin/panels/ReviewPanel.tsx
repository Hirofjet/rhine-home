import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  adminApi,
  errorMessage,
  type PendingPost,
  type PendingReply,
} from '../../../lib/api'
import { formatDateTime } from '../../../lib/format'
import { AttachmentGrid } from '../../forum/AttachmentGrid'
import {
  AdminBadge,
  AdminButton,
  AdminError,
  AdminInput,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'

/** 论坛内容审核：帖子与回复逐条通过 / 拒绝 */
export function ReviewPanel() {
  const [posts, setPosts] = useState<PendingPost[]>([])
  const [replies, setReplies] = useState<PendingReply[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.pending()
      setPosts(data.posts)
      setReplies(data.replies)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    adminApi
      .pending()
      .then((data) => {
        if (!alive) return
        setPosts(data.posts)
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
  }, [])

  const review = async (type: 'post' | 'reply', id: number, approve: boolean) => {
    const key = `${type}-${id}`
    try {
      await adminApi.review({ type, id, approve, note: notes[key] ?? '' })
      setNotice(approve ? '已通过审核' : '已拒绝')
      if (type === 'post') setPosts((current) => current.filter((item) => item.id !== id))
      else setReplies((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const total = posts.length + replies.length

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title={`待审核内容${total ? `（${total}）` : ''}`}
        subtitle="MODERATION QUEUE"
        actions={
          <AdminButton variant="ghost" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3" /> 刷新
          </AdminButton>
        }
      >
        {loading ? (
          <p className="font-mono text-[10px] tracking-wider text-rhine-faint">加载中…</p>
        ) : total === 0 ? (
          <p className="font-mono text-[10px] tracking-wider text-rhine-faint">
            当前没有待审核内容。
          </p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const key = `post-${post.id}`
              return (
                <article key={key} className="border border-rhine-line/70 bg-rhine-abyss/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge tone="gold">帖子</AdminBadge>
                    <span className="text-sm text-rhine-ink">{post.title}</span>
                    <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
                      {post.boardName} · {post.author} · {formatDateTime(post.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 border border-rhine-line/50 bg-rhine-panel/30 px-3 py-2">
                    <div className="md-body max-h-72 overflow-y-auto text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                    </div>
                    <AttachmentGrid attachments={post.attachments} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AdminInput
                      value={notes[key] ?? ''}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [key]: event.target.value }))
                      }
                      placeholder="审核备注（可选，会显示给作者）"
                      className="w-64"
                    />
                    <AdminButton onClick={() => void review('post', post.id, true)}>
                      <Check className="h-3 w-3" /> 通过
                    </AdminButton>
                    <AdminButton variant="danger" onClick={() => void review('post', post.id, false)}>
                      <X className="h-3 w-3" /> 拒绝
                    </AdminButton>
                  </div>
                </article>
              )
            })}

            {replies.map((reply) => {
              const key = `reply-${reply.id}`
              return (
                <article key={key} className="border border-rhine-line/70 bg-rhine-abyss/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge tone="cyan">回复</AdminBadge>
                    <span className="font-mono text-[10px] tracking-wider text-rhine-dim">
                      {reply.boardName} · 帖子《{reply.postTitle}》 · {reply.author} ·{' '}
                      {formatDateTime(reply.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-rhine-dim">
                    {reply.content}
                  </p>
                  {reply.attachments.length > 0 && (
                    <p className="mt-2 font-mono text-[9px] tracking-wider text-rhine-cyan">
                      附件：{reply.attachments.map((file) => file.name).join(' / ')}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AdminInput
                      value={notes[key] ?? ''}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [key]: event.target.value }))
                      }
                      placeholder="审核备注（可选）"
                      className="w-64"
                    />
                    <AdminButton onClick={() => void review('reply', reply.id, true)}>
                      <Check className="h-3 w-3" /> 通过
                    </AdminButton>
                    <AdminButton variant="danger" onClick={() => void review('reply', reply.id, false)}>
                      <X className="h-3 w-3" /> 拒绝
                    </AdminButton>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
