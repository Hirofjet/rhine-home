/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  forumApi,
  type Announcement,
  type Board,
  type BoardAccess,
} from '../../../lib/api'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
  AdminTextarea,
} from '../AdminUi'

const LABELS: Record<BoardAccess, string> = {
  public: '普通论坛',
  special: '特殊论坛',
  core: '核心论坛',
}

export function ForumClassPanel({ access }: { access: BoardAccess }) {
  const [boards, setBoards] = useState<Board[]>([])
  const [selected, setSelected] = useState<Board | null>(null)
  const [editing, setEditing] = useState<Board | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await adminApi.forumBoards()
      setBoards(data.boards.filter((board) => board.access === access))
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [access])

  useEffect(() => {
    void load()
  }, [load])

  const startEdit = (board: Board) => {
    setEditing(board)
    setName(board.name)
    setDescription(board.description)
    setTags((board.tags ?? []).join(', '))
  }

  const save = async () => {
    if (!editing) return
    try {
      await adminApi.updateBoard(editing.id, {
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      })
      setEditing(null)
      setNotice('论坛已更新')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (selected) {
    return (
      <BoardAdminView
        board={selected}
        onBack={() => {
          setSelected(null)
          void load()
        }}
      />
    )
  }

  const totalPosts = boards.reduce((sum, board) => sum + board.postCount, 0)
  const maxPosts = Math.max(1, ...boards.map((board) => board.postCount))
  const managedCount = boards.length

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel title={LABELS[access]} subtitle={`${access.toUpperCase()} BOARDS`}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">管理板块</p>
            <p className="mt-1 text-xl text-rhine-gold">{managedCount}</p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">帖子总数</p>
            <p className="mt-1 text-xl text-rhine-cyan">{totalPosts}</p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">待审内容</p>
            <p className="mt-1 text-xl text-rhine-red">
              {boards.reduce((sum, board) => sum + (board.pendingCount ?? 0), 0)}
            </p>
          </div>
        </div>
        <div className="mb-4 flex h-28 items-end gap-2 border border-rhine-line/60 p-3">
          {boards.map((board) => (
            <div key={board.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className="w-full bg-rhine-gold/50"
                style={{ height: `${Math.max(6, (board.postCount / maxPosts) * 80)}px` }}
                title={`${board.name}: ${board.postCount}`}
              />
              <span className="w-full truncate text-center font-mono text-[8px] text-rhine-faint">
                {board.name}
              </span>
            </div>
          ))}
          {boards.length === 0 && <span className="text-xs text-rhine-faint">暂无数据</span>}
        </div>
        <ul className="divide-y divide-rhine-line/60">
          {boards.map((board) => (
            <li key={board.id} className="flex flex-wrap items-center gap-3 py-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(board)}>
                <p className="text-sm text-rhine-ink">{board.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-rhine-faint">
                  {board.postCount} 帖 · {board.tags?.join(' · ') || '无标签'}
                </p>
              </button>
              <AdminButton variant="ghost" onClick={() => startEdit(board)}>
                <Pencil className="h-3 w-3" /> 编辑
              </AdminButton>
            </li>
          ))}
          {boards.length === 0 && <li className="py-3 text-xs text-rhine-faint">暂无板块</li>}
        </ul>
      </AdminPanel>

      {editing && (
        <AdminPanel title={`编辑 ${editing.name}`} subtitle="BOARD SETTINGS">
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="名称 / NAME">
              <AdminInput value={name} onChange={(event) => setName(event.target.value)} />
            </AdminField>
            <AdminField label="标签 / TAGS">
              <AdminInput value={tags} onChange={(event) => setTags(event.target.value)} />
            </AdminField>
          </div>
          <AdminField label="描述 / DESCRIPTION">
            <AdminTextarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </AdminField>
          <div className="flex gap-2">
            <AdminButton onClick={() => void save()}>保存</AdminButton>
            <AdminButton variant="ghost" onClick={() => setEditing(null)}>取消</AdminButton>
          </div>
        </AdminPanel>
      )}
    </div>
  )
}

function BoardAdminView({ board, onBack }: { board: Board; onBack: () => void }) {
  const [posts, setPosts] = useState<
    Array<{ id: number; title: string; status: string; pinned: boolean; author: string; replyCount: number; createdAt: string }>
  >([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [postData, annData] = await Promise.all([
        adminApi.boardPosts(board.id),
        forumApi.announcements(board.id),
      ])
      setPosts(postData.posts)
      setAnnouncements(annData.announcements.filter((item) => item.boardId === board.id))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [board.id])

  useEffect(() => {
    void load()
  }, [load])

  const publishAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return
    try {
      await adminApi.createAnnouncement({
        boardId: board.id,
        title: annTitle.trim(),
        content: annContent.trim(),
      })
      setAnnTitle('')
      setAnnContent('')
      setNotice('板块公告已发布')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const moderate = async (id: number, action: 'pin' | 'unpin' | 'hide' | 'restore' | 'delete') => {
    try {
      await adminApi.moderatePost(id, action)
      setNotice('帖子状态已更新')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const removeBoard = async () => {
    try {
      await adminApi.requestBoardDeletion(board.id)
      setNotice('删除申请已提交，等待高级管理员审批')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const replies = posts.reduce((sum, post) => sum + post.replyCount, 0)

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel
        title={board.name}
        subtitle="BOARD CONTROL"
        actions={
          <AdminButton variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-3 w-3" /> 返回论坛列表
          </AdminButton>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">帖子</p>
            <p className="text-xl text-rhine-gold">{posts.length}</p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">回复</p>
            <p className="text-xl text-rhine-cyan">{replies}</p>
          </div>
          <div className="border border-rhine-line/60 p-3">
            <p className="font-mono text-[9px] text-rhine-faint">待审</p>
            <p className="text-xl text-rhine-red">{board.pendingCount ?? 0}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-rhine-line/50 pt-3">
          <p className="mb-2 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">板块公告</p>
          <AdminInput value={annTitle} onChange={(event) => setAnnTitle(event.target.value)} placeholder="公告标题" />
          <AdminTextarea
            value={annContent}
            onChange={(event) => setAnnContent(event.target.value)}
            rows={2}
            placeholder="公告内容"
            className="mt-2"
          />
          <AdminButton className="mt-2" onClick={() => void publishAnnouncement()}>发布公告</AdminButton>
          <ul className="mt-2 space-y-1">
            {announcements.map((item) => (
              <li key={item.id} className="text-xs text-rhine-dim">· {item.title}</li>
            ))}
          </ul>
        </div>
      </AdminPanel>

      <AdminPanel title="帖子管理" subtitle="THREADS">
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="border border-rhine-line/60 bg-rhine-abyss/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] text-rhine-gold">{post.status}{post.pinned ? ' · PIN' : ''}</span>
                <span className="font-mono text-[9px] text-rhine-faint">{post.author}</span>
              </div>
              <h3 className="mt-1 text-sm text-rhine-ink">{post.title}</h3>
              <p className="mt-1 font-mono text-[9px] text-rhine-faint">{post.replyCount} 条回复</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to={`/forum/post/${post.id}`}
                  className="inline-flex items-center gap-1 border border-rhine-line px-2 py-1 font-mono text-[9px] text-rhine-dim hover:text-rhine-gold"
                >
                  <MessageSquare className="h-3 w-3" /> 查看回复
                </Link>
                <AdminButton variant="ghost" onClick={() => void moderate(post.id, post.pinned ? 'unpin' : 'pin')}>
                  {post.pinned ? '取消置顶' : '置顶'}
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => void moderate(post.id, post.status === 'hidden' ? 'restore' : 'hide')}>
                  {post.status === 'hidden' ? '恢复' : '隐藏'}
                </AdminButton>
                <AdminButton variant="danger" onClick={() => void moderate(post.id, 'delete')}>删除</AdminButton>
              </div>
            </article>
          ))}
          {posts.length === 0 && <p className="text-xs text-rhine-faint">暂无帖子</p>}
        </div>
        <div className="mt-4 flex justify-end">
          <AdminButton variant="danger" onClick={() => void removeBoard()}>
            <Trash2 className="h-3 w-3" /> 删除论坛
          </AdminButton>
        </div>
      </AdminPanel>
    </div>
  )
}
