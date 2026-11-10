import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { adminApi, errorMessage } from '../../../lib/api'
import { AdminButton, AdminError, AdminInput, AdminNotice, AdminPanel } from '../AdminUi'

interface Settings {
  emergencyStop: boolean
  repliesRequireReview: boolean
  guestbookRequireReview: boolean
}

export function ModerationPanel() {
  const [settings, setSettings] = useState<Settings>({
    emergencyStop: false,
    repliesRequireReview: true,
    guestbookRequireReview: true,
  })
  const [terms, setTerms] = useState<
    Array<{ id: number; term: string; action: 'review' | 'block'; enabled: number }>
  >([])
  const [term, setTerm] = useState('')
  const [action, setAction] = useState<'review' | 'block'>('review')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminApi.moderationSettings()
      setSettings(data.settings)
      setTerms(data.terms)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const saveSettings = async () => {
    try {
      await adminApi.saveModerationSettings(settings)
      setNotice('内容安全设置已保存')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const addTerm = async () => {
    if (!term.trim()) return
    try {
      await adminApi.addModerationTerm({ term: term.trim(), action })
      setTerm('')
      setNotice('关键词已添加')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const removeTerm = async (id: number) => {
    try {
      await adminApi.removeModerationTerm(id)
      setNotice('关键词已移除')
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
        title="内容安全设置"
        subtitle="MODERATION &amp; EMERGENCY"
        actions={
          <AdminButton variant="ghost" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3" /> 刷新
          </AdminButton>
        }
      >
        {loading ? (
          <p className="font-mono text-[10px] text-rhine-faint">加载中…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-xs text-rhine-dim">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.emergencyStop}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, emergencyStop: event.target.checked }))
                  }
                />
                紧急停止发布（帖子 / 回复 / 留言 / 私信）
              </label>
              <p className="border border-rhine-line/50 bg-rhine-abyss/30 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-rhine-faint">
                普通内容直接发布；只有命中「转人工审核」敏感词的内容进入审核队列，命中「直接拒绝」的内容立即拦截。
              </p>
            </div>
            <AdminButton onClick={() => void saveSettings()}>保存设置</AdminButton>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="敏感词规则" subtitle="KEYWORD RULES">
        <div className="flex flex-wrap gap-2">
          <AdminInput
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="输入词语"
            className="min-w-48 flex-1"
          />
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as 'review' | 'block')}
            className="border border-rhine-line bg-rhine-abyss px-2 py-1.5 font-mono text-[10px]"
          >
            <option value="review">转人工审核</option>
            <option value="block">直接拒绝</option>
          </select>
          <AdminButton onClick={() => void addTerm()}>
            <Plus className="h-3 w-3" /> 添加
          </AdminButton>
        </div>
        <ul className="mt-3 divide-y divide-rhine-line/60">
          {terms.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2 text-xs">
              <span className="min-w-0 flex-1 text-rhine-ink">{item.term}</span>
              <span className="font-mono text-[9px] text-rhine-gold">
                {item.action === 'block' ? '拒绝' : '审核'}
              </span>
              <button
                type="button"
                onClick={() => void removeTerm(item.id)}
                className="text-rhine-red"
                aria-label="删除关键词"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {terms.length === 0 && (
            <li className="py-4 font-mono text-[10px] text-rhine-faint">尚未配置关键词。</li>
          )}
        </ul>
      </AdminPanel>
    </div>
  )
}
