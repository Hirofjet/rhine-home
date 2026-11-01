/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, Pin, RefreshCw, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  adminApi,
  errorMessage,
  type ApiUser,
  type Attachment,
  type Board,
} from '../../../lib/api'
import { formatDateTime } from '../../../lib/format'
import { AttachmentGrid } from '../../forum/AttachmentGrid'
import {
  AdminBadge,
  AdminButton,
  AdminError,
  AdminModal,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'

interface AdminBoardPostsPanelProps {
  user: ApiUser
}

interface AdminPostRow {
  id: number
  title: string
  status: string
  pinned: boolean
  author: string
  replyCount: number
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  approved: '已发布',
  pending: '待审核',
  rejected: '已拒绝',
  hidden: '已隐藏',
  deleted: '已删除',
}

/** 进入板块管理帖子：置顶 / 隐藏 / 删除 */
export function AdminBoardPostsPanel({ user }: AdminBoardPostsPanelProps) {
  const [boards, setBoards] = useState<Board[]>([])
  const [boardId, setBoardId] = useState<number | null>(null)
  const [posts, setPosts] = useState<AdminPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [viewPost, setViewPost] = useState<{
    id: number
    title: string
    content: string
    attachments: Attachment[]
    tags: string[]
    pinned: boolean
    status: string
    boardName: string
    author: string
    createdAt: string
  } | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const openPost = async (id: number) => {
    setViewLoading(true)
    setError('')
    try {
      const data = await adminApi.adminPost(id)
      setViewPost(data.post)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setViewLoading(false)
    }
  }

  const loadBoards = useCallback(async () => {
    try {
      const data = await adminApi.forumBoards()
      setBoards(data.boards)
      setBoardId((current) => current ?? data.boards[0]?.id ?? null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  const loadPosts = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const data = await adminApi.boardPosts(id)
      setPosts(data.posts)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBoards()
  }, [loadBoards])

  useEffect(() => {
    if (boardId) void loadPosts(boardId)
  }, [boardId, loadPosts])

  const moderate = async (
    post: AdminPostRow,
    action: 'hide' | 'restore' | 'pin' | 'unpin' | 'delete',
  ) => {
    if (action === 'delete' && !window.confirm(`删除帖子「${post.title}」？`)) return
    try {
      await adminApi.moderatePost(post.id, action)
      setNotice('操作完成')
      if (boardId) await loadPosts(boardId)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const canManage = (board: Board) => user.isSuper || board.canModerate

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="帖子管理"
        subtitle="THREADS"
        actions={
          <AdminButton
            variant="ghost"
            onClick={() => boardId && void loadPosts(boardId)}
          >
            <RefreshCw className="h-3 w-3" /> 刷新
          </AdminButton>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={boardId ?? ''}
            onChange={(event) => setBoardId(Number(event.target.value))}
            className="border border-rhine-line bg-rhine-abyss/60 px-2 py-1.5 font-mono text-[11px] text-rhine-dim outline-none"
          >
            {boards.map((board) => (
              <option key={board.id} value={board.id} disabled={!canManage(board)}>
                {board.name}
                {board.pendingCount ? `（${board.pendingCount} 待审）` : ''}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="font-mono text-[10px] text-rhine-faint">加载中…</p>
        ) : posts.length === 0 ? (
          <p className="font-mono text-[10px] text-rhine-faint">这个板块还没有帖子。</p>
        ) : (
          <ul className="divide-y divide-rhine-line/60">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-2 py-3">
                <button
                  type="button"
                  onClick={() => void openPost(post.id)}
                  className="min-w-0 flex-1 truncate text-left text-xs text-rhine-ink hover:text-rhine-gold"
                >
                  {post.pinned && <Pin className="mr-1 inline h-3 w-3 text-rhine-gold" />}
                  {post.title}
                </button>
                <AdminBadge tone={post.status === 'approved' ? 'green' : 'gold'}>
                  {STATUS_LABEL[post.status] ?? post.status}
                </AdminBadge>
                <span className="font-mono text-[9px] text-rhine-faint">
                  {post.author} · {post.replyCount} 回复 · {formatDateTime(post.createdAt)}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <AdminButton
                    variant="ghost"
                    onClick={() => void moderate(post, post.pinned ? 'unpin' : 'pin')}
                  >
                    <Pin className="h-3 w-3" /> {post.pinned ? '取消置顶' : '置顶'}
                  </AdminButton>
                  {post.status === 'approved' ? (
                    <AdminButton variant="ghost" onClick={() => void moderate(post, 'hide')}>
                      <EyeOff className="h-3 w-3" /> 隐藏
                    </AdminButton>
                  ) : (
                    <AdminButton variant="ghost" onClick={() => void moderate(post, 'restore')}>
                      <Eye className="h-3 w-3" /> 恢复
                    </AdminButton>
                  )}
                  <AdminButton variant="danger" onClick={() => void moderate(post, 'delete')}>
                    <Trash2 className="h-3 w-3" /> 删除
                  </AdminButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminModal
        open={Boolean(viewPost) || viewLoading}
        onClose={() => setViewPost(null)}
        title={viewPost?.title ?? '加载中…'}
        subtitle="THREAD PREVIEW"
        wide
      >
        {viewLoading ? (
          <p className="font-mono text-[10px] text-rhine-faint">加载中…</p>
        ) : viewPost ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AdminBadge tone={viewPost.status === 'approved' ? 'green' : 'gold'}>
                {STATUS_LABEL[viewPost.status] ?? viewPost.status}
              </AdminBadge>
              {viewPost.pinned && <AdminBadge tone="gold">置顶</AdminBadge>}
              <span className="font-mono text-[10px] text-rhine-faint">
                {viewPost.boardName} · {viewPost.author} · {formatDateTime(viewPost.createdAt)}
              </span>
            </div>
            <div className="md-body max-h-[50vh] overflow-y-auto border border-rhine-line/60 bg-rhine-abyss/30 px-4 py-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewPost.content}</ReactMarkdown>
            </div>
            <AttachmentGrid attachments={viewPost.attachments} />
            <div className="flex flex-wrap justify-end gap-2 border-t border-rhine-line/50 pt-3">
              <AdminButton
                variant="ghost"
                onClick={() => {
                  void moderate(
                    {
                      id: viewPost.id,
                      title: viewPost.title,
                      status: viewPost.status,
                      pinned: viewPost.pinned,
                      author: viewPost.author,
                      replyCount: 0,
                      createdAt: viewPost.createdAt,
                    },
                    viewPost.pinned ? 'unpin' : 'pin',
                  )
                  setViewPost({ ...viewPost, pinned: !viewPost.pinned })
                }}
              >
                <Pin className="h-3 w-3" /> {viewPost.pinned ? '取消置顶' : '置顶'}
              </AdminButton>
              <AdminButton
                variant="ghost"
                onClick={() => {
                  void moderate(
                    {
                      id: viewPost.id,
                      title: viewPost.title,
                      status: viewPost.status,
                      pinned: viewPost.pinned,
                      author: viewPost.author,
                      replyCount: 0,
                      createdAt: viewPost.createdAt,
                    },
                    viewPost.status === 'approved' ? 'hide' : 'restore',
                  )
                  setViewPost({
                    ...viewPost,
                    status: viewPost.status === 'approved' ? 'hidden' : 'approved',
                  })
                }}
              >
                {viewPost.status === 'approved' ? (
                  <>
                    <EyeOff className="h-3 w-3" /> 隐藏
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> 恢复
                  </>
                )}
              </AdminButton>
              <AdminButton
                variant="danger"
                onClick={() => {
                  void moderate(
                    {
                      id: viewPost.id,
                      title: viewPost.title,
                      status: viewPost.status,
                      pinned: viewPost.pinned,
                      author: viewPost.author,
                      replyCount: 0,
                      createdAt: viewPost.createdAt,
                    },
                    'delete',
                  )
                  setViewPost(null)
                }}
              >
                <Trash2 className="h-3 w-3" /> 删除
              </AdminButton>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  )
}
