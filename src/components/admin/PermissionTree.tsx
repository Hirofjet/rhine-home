import type { Board } from '../../lib/api'
import { AdminCheckbox } from './AdminUi'

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
  const forumParent = has('forum')

  const apply = (next: string[]) => {
    if (!disabled) onChange([...new Set(next)])
  }

  const toggleForumParent = (checked: boolean) => {
    let next = value.filter((item) => item !== 'forum')
    next = next.filter((item) => !/^forum(?:\.|$)/.test(item))
    if (checked) next.push('forum')
    apply(next)
  }

  const toggleForumChild = (key: string, checked: boolean) => {
    let next = value.filter((item) => item !== 'forum')
    if (checked) {
      if (!next.includes(key)) next.push(key)
    } else {
      next = next.filter((item) => item !== key && !item.startsWith(`${key}.`))
    }
    apply(next)
  }

  const toggleAction = (key: string, checked: boolean) => {
    if (forumParent) return
    const next = checked
      ? [...value.filter((item) => item !== key), key]
      : value.filter((item) => item !== key)
    apply(next)
  }

  const groupTitle = (text: string) => (
    <p className="mb-1.5 font-mono text-[9px] tracking-[0.28em] text-rhine-faint">
      {text}
    </p>
  )

  return (
    <div className="space-y-4">
      {groupTitle('项目库 / PROJECTS')}
      <div className="border-l border-rhine-line/60 pl-3">
        <AdminCheckbox
          checked={has('projects')}
          onChange={(checked) => {
            const next = value.filter((item) => item !== 'projects')
            apply(checked ? [...next, 'projects'] : next)
          }}
          label="项目库管理"
          disabled={disabled}
        />
        <p className="mt-1 font-mono text-[8px] leading-relaxed text-rhine-faint">
          主页资料与档案包含个人信息，固定只有 admin 可以修改。
        </p>
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

      {groupTitle('留言板 / GUESTBOOK')}
      <div className="border-l border-rhine-line/60 pl-3">
        <AdminCheckbox
          checked={has('guestbook')}
          onChange={(checked) => {
            const next = value.filter((item) => item !== 'guestbook')
            apply(checked ? [...next, 'guestbook'] : next)
          }}
          label="留言板管理"
          disabled={disabled}
        />
      </div>

      {groupTitle('论坛 / FORUM')}
      <div className="space-y-2 border-l border-rhine-line/60 pl-3">
        <p className="font-mono text-[8px] leading-relaxed text-rhine-faint">
          「全部板块」会授予现有及未来所有论坛；只授予单个板块请逐项勾选，不会自动扩大到全部普通论坛。
        </p>
        <AdminCheckbox
          checked={forumParent}
          onChange={toggleForumParent}
          label="论坛（全部板块）"
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-2 pl-4">
          {boards.map((board) => {
            const boardKey = `forum.${board.id}`
            const full = forumParent || has(boardKey)
            const actions = [
              ['post.pin', '置顶'],
              ['post.hide', '隐藏'],
              ['post.delete', '删帖'],
              ['post.review', '审帖'],
              ['reply.delete', '删回复'],
              ['reply.review', '审回复'],
            ] as const
            return (
              <div key={board.id} className="min-w-48 space-y-1">
                <AdminCheckbox
                  checked={full}
                  onChange={(checked) => toggleForumChild(boardKey, checked)}
                  label={`${board.name}${
                    board.access === 'core'
                      ? '（核心）'
                      : board.access === 'special'
                        ? '（特殊）'
                        : ''
                  }`}
                  disabled={disabled}
                />
                <div className="flex flex-wrap gap-x-3 gap-y-1 pl-4">
                  {actions.map(([action, label]) => {
                    const key = `${boardKey}.${action}`
                    return (
                      <AdminCheckbox
                        key={key}
                        checked={full || has(key)}
                        onChange={(checked) => toggleAction(key, checked)}
                        label={label}
                        disabled={disabled || full}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
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
            <AdminCheckbox
              checked={has('security.readonly')}
              onChange={(checked) => {
                let next = value.filter((item) => item !== 'security.readonly')
                if (checked) next = [...next, 'security.readonly']
                apply(next)
              }}
              label="安全只读"
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
