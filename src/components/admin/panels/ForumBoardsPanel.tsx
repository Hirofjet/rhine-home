import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  hasPerm,
  type ApiUser,
  type Board,
} from '../../../lib/api'
import {
  AdminBadge,
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminModal,
  AdminNotice,
  AdminPanel,
  AdminTextarea,
} from '../AdminUi'

interface BoardForm {
  name: string
  slug: string
  description: string
  sort: string
}

const emptyForm: BoardForm = { name: '', slug: '', description: '', sort: '0' }

/** 论坛板块管理（创建 / 编辑 / 删除） */
export function ForumBoardsPanel({ user }: { user: ApiUser }) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Board | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BoardForm>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null)

  const canManageAll = user.isSuper || hasPerm(user, 'forum')

  const load = useCallback(async () => {
    try {
      const data = await adminApi.forumBoards()
      setBoards(data.boards)
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
      .forumBoards()
      .then((data) => {
        if (!alive) return
        setBoards(data.boards)
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

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (board: Board) => {
    setEditing(board)
    setForm({
      name: board.name,
      slug: board.slug,
      description: board.description,
      sort: String(board.sort),
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('名称与 slug 必填')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim(),
        sort: Number(form.sort) || 0,
      }
      if (editing) await adminApi.updateBoard(editing.id, payload)
      else await adminApi.createBoard(payload)
      setNotice(editing ? '板块已更新' : '板块已创建')
      setOpen(false)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.removeBoard(deleteTarget.id)
      setNotice('板块及其内容已删除')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="论坛板块"
        subtitle="FORUM BOARDS"
        actions={
          <>
            <AdminButton variant="ghost" onClick={() => void load()}>
              <RefreshCw className="h-3 w-3" /> 刷新
            </AdminButton>
            {canManageAll && (
              <AdminButton onClick={openCreate}>
                <Plus className="h-3 w-3" /> 新建板块
              </AdminButton>
            )}
          </>
        }
      >
        {!canManageAll && (
          <p className="mb-3 border border-rhine-gold/30 bg-rhine-gold/5 px-3 py-2 font-mono text-[10px] tracking-wider text-rhine-gold">
            当前账号只能管理已授权的板块内容，不能创建 / 删除板块。
          </p>
        )}

        {loading ? (
          <p className="font-mono text-[10px] tracking-wider text-rhine-faint">加载中…</p>
        ) : (
          <ul className="divide-y divide-rhine-line/60">
            {boards.map((board) => (
              <li key={board.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-rhine-ink">{board.name}</p>
                    <AdminBadge>{board.slug}</AdminBadge>
                    {board.pendingCount ? (
                      <AdminBadge tone="gold">{board.pendingCount} 待审</AdminBadge>
                    ) : null}
                    {!board.canModerate && !user.isSuper ? (
                      <AdminBadge tone="red">无审核权限</AdminBadge>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[10px] tracking-wider text-rhine-faint">
                    {board.description || '暂无描述'} · {board.postCount} 帖
                  </p>
                </div>
                {canManageAll && (
                  <div className="flex gap-2">
                    <AdminButton variant="ghost" onClick={() => openEdit(board)}>
                      编辑
                    </AdminButton>
                    <AdminButton variant="danger" onClick={() => setDeleteTarget(board)}>
                      <Trash2 className="h-3 w-3" /> 删除
                    </AdminButton>
                  </div>
                )}
              </li>
            ))}
            {boards.length === 0 && (
              <li className="py-4 font-mono text-[10px] tracking-wider text-rhine-faint">
                还没有板块。
              </li>
            )}
          </ul>
        )}
      </AdminPanel>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? '编辑板块' : '新建板块'}
        subtitle="FORUM BOARD"
      >
        <div className="space-y-3">
          <AdminField label="名称 / NAME">
            <AdminInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="综合讨论"
            />
          </AdminField>
          <AdminField label="Slug / URL" hint="小写字母、数字、短横线">
            <AdminInput
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="general"
            />
          </AdminField>
          <AdminField label="描述 / DESCRIPTION">
            <AdminTextarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="min-h-20"
            />
          </AdminField>
          <AdminField label="排序 / SORT">
            <AdminInput
              type="number"
              value={form.sort}
              onChange={(event) => setForm({ ...form, sort: event.target.value })}
            />
          </AdminField>
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setOpen(false)}>
              取消
            </AdminButton>
            <AdminButton onClick={() => void save()} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="删除板块"
        subtitle="DANGER"
      >
        <p className="font-mono text-[11px] leading-relaxed tracking-wider text-rhine-dim">
          删除「{deleteTarget?.name}」会同时删除该板块下的全部帖子与回复，且无法恢复。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={() => setDeleteTarget(null)}>
            取消
          </AdminButton>
          <AdminButton variant="danger" onClick={() => void remove()}>
            确认删除
          </AdminButton>
        </div>
      </AdminModal>
    </div>
  )
}
