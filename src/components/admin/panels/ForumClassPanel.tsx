/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { adminApi, errorMessage, type Board, type BoardAccess } from '../../../lib/api'
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

  const requestDelete = async (board: Board) => {
    try {
      await adminApi.requestBoardDeletion(board.id)
      setNotice('删除申请已提交，等待高级管理员审批')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel title={LABELS[access]} subtitle={`${access.toUpperCase()} BOARDS`}>
        <div className="mb-3 flex flex-wrap gap-4 font-mono text-[10px] text-rhine-faint">
          <span>板块 {boards.length}</span>
          <span>帖子 {boards.reduce((sum, board) => sum + board.postCount, 0)}</span>
        </div>
        <ul className="divide-y divide-rhine-line/60">
          {boards.map((board) => (
            <li key={board.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-rhine-ink">{board.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-rhine-faint">
                  {board.postCount} 帖 · {board.tags?.join(' · ') || '无标签'}
                </p>
              </div>
              <AdminButton variant="ghost" onClick={() => startEdit(board)}>
                <Pencil className="h-3 w-3" /> 编辑
              </AdminButton>
              <AdminButton variant="danger" onClick={() => void requestDelete(board)}>
                <Trash2 className="h-3 w-3" /> 申请删除
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
