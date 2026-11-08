import { useEffect, useState } from 'react'
import { Award, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { adminApi, errorMessage } from '../../../lib/api'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
} from '../AdminUi'

interface Rule {
  level: number
  minPoints: number
  title: string
}

interface ForumUser {
  id: number
  username: string
  nickname: string
  forumTitle?: string
  forumTitleLocked?: boolean
  forumPoints?: number
  forumLevel?: number
}

/** 论坛头衔：自动等级规则 + 管理员手动发放。 */
export function ForumTitlesPanel() {
  const [rules, setRules] = useState<Rule[]>([])
  const [users, setUsers] = useState<ForumUser[]>([])
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState('')
  const [title, setTitle] = useState('')
  const [locked, setLocked] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const [ruleData, userData] = await Promise.all([
        adminApi.forumTitleRules(),
        adminApi.forumUsers(),
      ])
      setRules(
        ruleData.rules.map((rule) => ({
          level: Number(rule.level),
          minPoints: Number(rule.minPoints),
          title: rule.title,
        })),
      )
      setUsers(userData.users)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const updateRule = (index: number, patch: Partial<Rule>) => {
    setRules((current) =>
      current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)),
    )
  }

  const saveRules = async () => {
    setBusy(true)
    setError('')
    try {
      await adminApi.saveForumTitleRules(
        rules
          .filter((rule) => rule.title.trim() && rule.level > 0)
          .map((rule) => ({
            level: Number(rule.level),
            minPoints: Number(rule.minPoints),
            title: rule.title.trim(),
          })),
      )
      setNotice('活跃等级规则已保存，现有成员已重新计算')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const grant = async () => {
    if (!target) {
      setError('请选择成员')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.grantForumTitle(Number(target), title.trim(), locked)
      setNotice(title.trim() ? '头衔已发放' : '已恢复自动等级头衔')
      setTitle('')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const filtered = users.filter(
    (user) =>
      !query.trim() ||
      user.username.toLowerCase().includes(query.trim().toLowerCase()) ||
      (user.forumTitle ?? '').toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />

      <AdminPanel
        title="论坛活跃等级"
        subtitle="ACTIVITY LEVELS"
        actions={
          <AdminButton variant="ghost" onClick={() => void load()} disabled={busy}>
            <RefreshCw className="h-3 w-3" /> 刷新
          </AdminButton>
        }
      >
        <p className="mb-3 font-mono text-[9px] leading-relaxed text-rhine-faint">
          积分规则：审核通过的主题 +5，回复 +1。达到最低积分时自动发放对应等级头衔；手动锁定头衔后不会被自动覆盖。
        </p>
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="grid gap-2 border border-rhine-line/50 p-2 sm:grid-cols-[90px_110px_1fr_40px]">
              <AdminField label="等级">
                <AdminInput
                  type="number"
                  min={1}
                  value={rule.level}
                  onChange={(event) => updateRule(index, { level: Number(event.target.value) })}
                />
              </AdminField>
              <AdminField label="最低积分">
                <AdminInput
                  type="number"
                  min={0}
                  value={rule.minPoints}
                  onChange={(event) => updateRule(index, { minPoints: Number(event.target.value) })}
                />
              </AdminField>
              <AdminField label="头衔">
                <AdminInput
                  value={rule.title}
                  onChange={(event) => updateRule(index, { title: event.target.value })}
                  placeholder="例如：档案研究员"
                />
              </AdminField>
              <button
                type="button"
                onClick={() => setRules((current) => current.filter((_, i) => i !== index))}
                className="mt-4 flex h-9 items-center justify-center border border-rhine-line text-rhine-faint hover:text-rhine-red"
                aria-label="删除等级规则"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton
            variant="ghost"
            onClick={() =>
              setRules((current) => [...current, { level: current.length + 1, minPoints: 0, title: '' }])
            }
          >
            <Plus className="h-3 w-3" /> 添加等级
          </AdminButton>
          <AdminButton onClick={() => void saveRules()} disabled={busy}>
            保存规则并重算
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel title="发放头衔" subtitle="GRANT TITLE">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <AdminField label="成员">
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="h-9 w-full border border-rhine-line bg-rhine-abyss/70 px-2 font-mono text-xs text-rhine-ink"
            >
              <option value="">选择成员</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nickname} · Lv.{user.forumLevel ?? 0} · {user.forumPoints ?? 0} 分
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="头衔（留空恢复自动）">
            <AdminInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="留空则使用等级头衔"
              maxLength={64}
            />
          </AdminField>
          <div className="flex items-end gap-2">
            <label className="flex h-9 items-center gap-2 font-mono text-[10px] text-rhine-dim">
              <input
                type="checkbox"
                checked={locked}
                onChange={(event) => setLocked(event.target.checked)}
              />
              锁定
            </label>
            <AdminButton onClick={() => void grant()} disabled={busy}>
              <Award className="h-3 w-3" /> 发放
            </AdminButton>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="成员头衔与等级" subtitle="MEMBER LEVELS">
        <AdminInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索成员或头衔"
          className="mb-3 max-w-64"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-rhine-line/60 font-mono text-[9px] tracking-wider text-rhine-faint">
                <th className="py-2 pr-3 font-normal">成员</th>
                <th className="py-2 pr-3 font-normal">头衔</th>
                <th className="py-2 pr-3 font-normal">等级</th>
                <th className="py-2 font-normal">积分</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-rhine-line/40 text-xs text-rhine-dim">
                  <td className="py-2 pr-3 text-rhine-ink">{user.nickname}</td>
                  <td className="py-2 pr-3">{user.forumTitle || '自动/未设置'}</td>
                  <td className="py-2 pr-3 font-mono">Lv.{user.forumLevel ?? 0}</td>
                  <td className="py-2 font-mono">{user.forumPoints ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
