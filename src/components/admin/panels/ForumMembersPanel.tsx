/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  type Board,
  type BoardAccess,
} from '../../../lib/api'
import {
  AdminBadge,
  AdminButton,
  AdminError,
  AdminField,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'
import { BOARD_ACCESS_LABELS } from './ForumMaintenancePanel'

interface Candidate {
  id: number
  username: string
  nickname: string
  email: string
  identity: string
  role: string
}

interface Moderator {
  id: number
  boardId: number
  boardName: string
  access: string
  userId: number
  username: string
  role: 'master' | 'admin'
  createdAt: string
}

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部类别' },
  { value: 'public', label: '普通论坛' },
  { value: 'special', label: '特殊论坛' },
  { value: 'core', label: '核心论坛' },
]

export function ForumMembersPanel() {
  const [boards, setBoards] = useState<Board[]>([])
  const [moderators, setModerators] = useState<Moderator[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<Candidate | null>(null)
  const [category, setCategory] = useState('all')
  const [adminType, setAdminType] = useState<'master' | 'admin'>('admin')
  const [boardQuery, setBoardQuery] = useState('')
  const [boardId, setBoardId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [boardData, moderatorData, candidateData] = await Promise.all([
        adminApi.forumBoards(),
        adminApi.forumModerators(),
        adminApi.forumMemberCandidates(''),
      ])
      setBoards(boardData.boards)
      setModerators(moderatorData.moderators)
      setCandidates(candidateData.users)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredCandidates = useMemo(() => {
    const keyword = memberQuery.trim().toLowerCase()
    if (!keyword) return candidates.slice(0, 30)
    return candidates
      .filter(
        (item) =>
          item.username.toLowerCase().includes(keyword) ||
          item.nickname.toLowerCase().includes(keyword) ||
          item.email.toLowerCase().includes(keyword),
      )
      .slice(0, 30)
  }, [candidates, memberQuery])

  const categoryBoards = useMemo(
    () => boards.filter((board) => category === 'all' || board.access === category),
    [boards, category],
  )
  const boardOptions = categoryBoards.filter((board) => {
    const keyword = boardQuery.trim().toLowerCase()
    return !keyword || board.name.toLowerCase().includes(keyword) || board.slug.includes(keyword)
  })

  useEffect(() => {
    if (adminType === 'master') return
    if (!boardOptions.some((board) => String(board.id) === boardId)) {
      setBoardId(boardOptions[0] ? String(boardOptions[0].id) : '')
    }
  }, [adminType, boardId, boardOptions])

  const filteredModerators = moderators.filter((item) => {
    const keyword = query.trim().toLowerCase()
    return (
      !keyword ||
      item.username.toLowerCase().includes(keyword) ||
      item.boardName.toLowerCase().includes(keyword)
    )
  })

  const assign = async () => {
    if (!selectedUser) {
      setError('请选择成员')
      return
    }
    if (adminType === 'admin' && !boardId) {
      setError('子管理员必须选择具体论坛')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const targets =
        adminType === 'master'
          ? categoryBoards
          : categoryBoards.filter((board) => String(board.id) === boardId)
      if (!targets.length) {
        setError('当前类别下没有可分配的论坛')
        return
      }
      if (adminType === 'master' && !window.confirm(
        `将 ${selectedUser.nickname || selectedUser.username} 设为 ${targets.length} 个论坛的总管理员？`,
      )) {
        return
      }
      let ok = 0
      let failed = 0
      for (const board of targets) {
        try {
          await adminApi.assignModerator({
            boardId: board.id,
            userId: selectedUser.id,
            role: adminType,
          })
          ok += 1
        } catch {
          failed += 1
        }
      }
      setNotice(
        `已分配 ${ok} 个论坛${failed ? `，${failed} 个失败（可能已有管理员或达到名额）` : ''}`,
      )
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: Moderator) => {
    if (!window.confirm(`移除 ${item.username} 对「${item.boardName}」的管理权限？`)) return
    setBusy(true)
    try {
      await adminApi.removeModerator(item.id)
      setNotice('论坛成员权限已移除')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const cardClass = 'border border-rhine-line/60 bg-rhine-panel/30 p-3'

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel title="论坛成员管理" subtitle="FORUM MEMBERS">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className={cardClass}>
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-rhine-gold">
              <UserRound className="h-3 w-3" /> 1. 选择成员
            </p>
            <div className="flex items-center gap-2 border border-rhine-line bg-rhine-abyss/50 px-2 py-1.5">
              <Search className="h-3 w-3 text-rhine-faint" />
              <input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder="搜索用户名 / 昵称 / 邮箱"
                className="w-full bg-transparent font-mono text-[10px] text-rhine-ink outline-none"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto border border-rhine-line/40">
              {filteredCandidates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedUser(item)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-rhine-line/30 px-2 py-1.5 text-left last:border-b-0 ${
                    selectedUser?.id === item.id ? 'bg-rhine-gold/10 text-rhine-gold' : 'text-rhine-dim'
                  }`}
                >
                  <span className="min-w-0 truncate text-xs">
                    {item.nickname}
                    <span className="ml-1 font-mono text-[9px] text-rhine-faint">@{item.username}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[8px] text-rhine-faint">{item.role}</span>
                </button>
              ))}
              {filteredCandidates.length === 0 && (
                <p className="p-3 text-center text-xs text-rhine-faint">没有匹配的成员</p>
              )}
            </div>
            <p className="mt-2 font-mono text-[8px] leading-relaxed text-rhine-faint">
              已自动排除超级管理员、高级管理员、论坛总管理员及拥有全论坛权限的账号，避免重复授权。
            </p>
          </div>

          <div className={cardClass}>
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-rhine-gold">
              <ShieldCheck className="h-3 w-3" /> 2. 类别与管理员类型
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <AdminField label="论坛类别">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-9 w-full border border-rhine-line bg-rhine-abyss/70 px-2 font-mono text-xs text-rhine-ink"
                >
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="管理员类型">
                <select
                  value={adminType}
                  onChange={(event) => setAdminType(event.target.value as 'master' | 'admin')}
                  className="h-9 w-full border border-rhine-line bg-rhine-abyss/70 px-2 font-mono text-xs text-rhine-ink"
                >
                  <option value="master">总管理员</option>
                  <option value="admin">子管理员</option>
                </select>
              </AdminField>
            </div>

            {adminType === 'admin' ? (
              <div className="mt-2 space-y-1">
                <AdminField label="3. 选择论坛">
                  <div className="flex items-center gap-1 border border-rhine-line bg-rhine-abyss/50 px-2">
                    <Search className="h-3 w-3 text-rhine-faint" />
                    <input
                      value={boardQuery}
                      onChange={(event) => setBoardQuery(event.target.value)}
                      placeholder="搜索论坛（论坛很多时使用）"
                      className="w-full bg-transparent py-1.5 font-mono text-[10px] outline-none"
                    />
                  </div>
                  <select
                    value={boardId}
                    onChange={(event) => setBoardId(event.target.value)}
                    className="h-9 w-full border border-rhine-line bg-rhine-abyss/70 px-2 font-mono text-xs text-rhine-ink"
                  >
                    {boardOptions.map((board) => (
                      <option key={board.id} value={board.id}>
                        {BOARD_ACCESS_LABELS[board.access]} · {board.name}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <p className="font-mono text-[8px] text-rhine-faint">
                  当前类别有 {categoryBoards.length} 个论坛，可搜索后选择。
                </p>
              </div>
            ) : (
              <p className="mt-3 border border-rhine-gold/30 bg-rhine-gold/[0.04] px-2 py-2 font-mono text-[9px] leading-relaxed text-rhine-dim">
                总管理员将授予当前类别下的全部论坛（{categoryBoards.length} 个）。
              </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[9px] text-rhine-faint">
                当前成员：{selectedUser?.nickname || '未选择'}
              </span>
              <AdminButton onClick={() => void assign()} disabled={busy || !selectedUser}>
                <Plus className="h-3 w-3" /> 分配
              </AdminButton>
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="现有论坛成员" subtitle="CURRENT MEMBERS">
        <div className="mb-2 flex items-center gap-2 border border-rhine-line bg-rhine-abyss/50 px-2 py-1.5">
          <Search className="h-3 w-3 text-rhine-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索成员或论坛"
            className="w-full bg-transparent font-mono text-[10px] text-rhine-ink outline-none"
          />
          <span className="shrink-0 font-mono text-[9px] text-rhine-faint">
            {filteredModerators.length} 条
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filteredModerators.map((item) => (
            <article key={item.id} className={cardClass}>
              <div className="flex items-center justify-between gap-2">
                <AdminBadge tone={item.role === 'master' ? 'gold' : 'cyan'}>
                  {item.role === 'master' ? '总管理员' : '子管理员'}
                </AdminBadge>
                <span className="font-mono text-[8px] text-rhine-faint">
                  {BOARD_ACCESS_LABELS[item.access as BoardAccess] ?? item.access}
                </span>
              </div>
              <p className="mt-2 truncate text-sm text-rhine-ink">{item.username}</p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-rhine-dim">{item.boardName}</p>
              <div className="mt-2 flex justify-end">
                <AdminButton variant="danger" onClick={() => void remove(item)} disabled={busy}>
                  <Trash2 className="h-3 w-3" /> 移除
                </AdminButton>
              </div>
            </article>
          ))}
          {filteredModerators.length === 0 && (
            <p className="p-4 text-center text-xs text-rhine-faint md:col-span-2 xl:col-span-3">
              暂无论坛成员
            </p>
          )}
        </div>
      </AdminPanel>
    </div>
  )
}
