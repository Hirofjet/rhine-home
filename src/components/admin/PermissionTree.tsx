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

/** 权限勾选树：档案（子权限）/ 日志 / 论坛（按板块）/ 成员管理 */
export function PermissionTree({
  value,
  onChange,
  boards,
  allowMemberPermissions,
  disabled = false,
}: PermissionTreeProps) {
  const has = (key: string) => value.includes(key)

  const toggle = (key: string, checked: boolean) => {
    if (disabled) return
    let next = checked ? [...value, key] : value.filter((item) => item !== key)
    if (checked) {
      if (key === 'archive') {
        next = next.filter((item) => !item.startsWith('archive.'))
      }
      if (key === 'forum') {
        next = next.filter((item) => !/^forum\.\d+$/.test(item))
      }
      if (key.startsWith('archive.')) {
        next = next.filter((item) => item !== 'archive')
      }
      if (/^forum\.\d+$/.test(key)) {
        next = next.filter((item) => item !== 'forum')
      }
    }
    onChange([...new Set(next)])
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
          checked={has('archive')}
          onChange={(checked) => toggle('archive', checked)}
          label="档案（全部）"
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-4 pl-4">
          {ARCHIVE_CHILDREN.map(([key, label]) => (
            <AdminCheckbox
              key={key}
              checked={has(key)}
              onChange={(checked) => toggle(key, checked)}
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
          onChange={(checked) => toggle('logs', checked)}
          label="日志"
          disabled={disabled}
        />
      </div>

      {groupTitle('论坛 / FORUM')}
      <div className="space-y-2 border-l border-rhine-line/60 pl-3">
        <AdminCheckbox
          checked={has('forum')}
          onChange={(checked) => toggle('forum', checked)}
          label="论坛（全部板块）"
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-2 pl-4">
          {boards.map((board) => (
            <AdminCheckbox
              key={board.id}
              checked={has(`forum.${board.id}`)}
              onChange={(checked) => toggle(`forum.${board.id}`, checked)}
              label={board.name}
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
              onChange={(checked) => toggle('members.manage', checked)}
              label="管理成员"
              disabled={disabled}
            />
            <AdminCheckbox
              checked={has('members.grant')}
              onChange={(checked) => toggle('members.grant', checked)}
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
