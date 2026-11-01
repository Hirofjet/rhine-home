import type { Board } from '../../lib/api'
import { AdminCheckbox } from './AdminUi'

const ARCHIVE_CHILDREN: Array<[string, string]> = [
  ['archive.articles', '文章'],
  ['archive.photos', '照片'],
  ['archive.videos', '视频'],
]

interface PermissionTreeProps {
  value: string[]
  onChange: (next: string[]) => void
  boards: Board[]
  /** 只有超级用户可以授予「管理成员 / 授权权限」 */
  allowMemberPermissions: boolean
  disabled?: boolean
}

/** 权限勾选树：父级与子级双向联动 */
export function PermissionTree({
  value,
  onChange,
  boards,
  allowMemberPermissions,
  disabled = false,
}: PermissionTreeProps) {
  const has = (key: string) => value.includes(key)
  const archiveAll = ARCHIVE_CHILDREN.every(([key]) => has(key))
  const archiveParent = has('archive') || archiveAll
  const forumChildren = boards.map((board) => `forum.${board.id}`)
  const forumAll = forumChildren.length > 0 && forumChildren.every((key) => has(key))
  const forumParent = has('forum') || forumAll

  const apply = (next: string[]) => {
    if (!disabled) onChange([...new Set(next)])
  }

  const toggleArchiveParent = (checked: boolean) => {
    let next = value.filter((item) => item !== 'archive')
    next = next.filter((item) => !item.startsWith('archive.'))
    if (checked) next.push('archive', ...ARCHIVE_CHILDREN.map(([key]) => key))
    apply(next)
  }

  const toggleArchiveChild = (key: string, checked: boolean) => {
    let next = value.filter((item) => item !== 'archive')
    if (checked) {
      if (!next.includes(key)) next.push(key)
      if (ARCHIVE_CHILDREN.every(([child]) => next.includes(child))) {
        next.push('archive')
      }
    } else {
      next = next.filter((item) => item !== key)
    }
    apply(next)
  }

  const toggleForumParent = (checked: boolean) => {
    let next = value.filter((item) => item !== 'forum')
    next = next.filter((item) => !/^forum\.\d+$/.test(item))
    if (checked) next.push('forum', ...forumChildren)
    apply(next)
  }

  const toggleForumChild = (key: string, checked: boolean) => {
    let next = value.filter((item) => item !== 'forum')
    if (checked) {
      if (!next.includes(key)) next.push(key)
      if (forumChildren.length > 0 && forumChildren.every((child) => next.includes(child))) {
        next.push('forum')
      }
    } else {
      next = next.filter((item) => item !== key)
    }
    apply(next)
  }

  const groupTitle = (text: string) => (
    <p className="mb-1.5 font-mono text-[9px] tracking-[0.28em] text-rhine-faint">
      {text}
    </p>
  )

  return (
    <div className="space-y-4">
      {groupTitle('档案 / ARCHIVE')}
      <div className="space-y-2 border-l border-rhine-line/60 pl-3">
        <AdminCheckbox
          checked={archiveParent}
          onChange={toggleArchiveParent}
          label="档案（全部）"
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-4 pl-4">
          {ARCHIVE_CHILDREN.map(([key, label]) => (
            <AdminCheckbox
              key={key}
              checked={archiveParent || has(key)}
              onChange={(checked) => toggleArchiveChild(key, checked)}
              label={label}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {groupTitle('日志 / LOGS')}
      <div className="border-l border-rhine-line/60 pl-3">
        <AdminCheckbox
          checked={has('logs')}
          onChange={(checked) => {
            const next = value.filter((item) => item !== 'logs')
            apply(checked ? [...next, 'logs'] : next)
          }}
          label="日志"
          disabled={disabled}
        />
      </div>

      {groupTitle('论坛 / FORUM')}
      <div className="space-y-2 border-l border-rhine-line/60 pl-3">
        <AdminCheckbox
          checked={forumParent}
          onChange={toggleForumParent}
          label="论坛（全部板块）"
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-2 pl-4">
          {boards.map((board) => (
            <AdminCheckbox
              key={board.id}
              checked={forumParent || has(`forum.${board.id}`)}
              onChange={(checked) => toggleForumChild(`forum.${board.id}`, checked)}
              label={`${board.name}${
                board.access === 'core'
                  ? '（核心）'
                  : board.access === 'special'
                    ? '（特殊）'
                    : ''
              }`}
              disabled={disabled}
            />
          ))}
          {boards.length === 0 && (
            <span className="font-mono text-[9px] tracking-wider text-rhine-faint">
              暂无板块
            </span>
          )}
        </div>
      </div>

      {allowMemberPermissions && (
        <>
          {groupTitle('成员管理 / MEMBERS')}
          <div className="flex flex-wrap gap-5 border-l border-rhine-line/60 pl-3">
            <AdminCheckbox
              checked={has('members.manage')}
              onChange={(checked) => {
                let next = value.filter((item) => item !== 'members.manage')
                if (checked) next = [...next, 'members.manage']
                apply(next)
              }}
              label="管理成员"
              disabled={disabled}
            />
            <AdminCheckbox
              checked={has('members.grant')}
              onChange={(checked) => {
                let next = value.filter((item) => item !== 'members.grant')
                if (checked) next = [...next, 'members.grant']
                apply(next)
              }}
              label="授权权限"
              disabled={disabled}
            />
          </div>
        </>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="font-mono text-[9px] tracking-[0.18em] text-rhine-faint underline-offset-2 hover:text-rhine-red hover:underline"
        >
          清空全部权限
        </button>
      )}
    </div>
  )
}
