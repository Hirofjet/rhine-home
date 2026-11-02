/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { FolderKanban, Plus, Trash2 } from 'lucide-react'
import { adminApi, errorMessage, type SiteProject } from '../../../lib/api'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
} from '../AdminUi'

interface Draft {
  id: number | null
  code: string
  name: string
  shortName: string
  description: string
  type: string
  tags: string
  author: string
  status: string
  version: string
  githubUrl: string
  details: string
  visible: boolean
}

const empty = (): Draft => ({
  id: null,
  code: '',
  name: '',
  shortName: '',
  description: '',
  type: '',
  tags: '',
  author: '',
  status: 'ACTIVE',
  version: '0.1.0',
  githubUrl: '',
  details: '',
  visible: true,
})

const from = (item: SiteProject): Draft => ({
  id: item.id,
  code: item.code,
  name: item.name,
  shortName: item.shortName,
  description: item.description,
  type: item.type,
  tags: item.tags.join(', '),
  author: item.author,
  status: item.status,
  version: item.version,
  githubUrl: item.githubUrl,
  details: item.details,
  visible: item.visible,
})

export function ProjectsPanel() {
  const [items, setItems] = useState<SiteProject[]>([])
  const [draft, setDraft] = useState<Draft>(empty)
  const [formOpen, setFormOpen] = useState(false)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await adminApi.projects()
      setItems(data.items)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!draft.name.trim() || !draft.description.trim()) {
      setError('项目名称、描述不能为空')
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = {
        code: draft.code,
        name: draft.name,
        shortName: draft.shortName,
        description: draft.description,
        type: draft.type,
        tags: draft.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
        author: draft.author,
        status: draft.status,
        version: draft.version,
        githubUrl: draft.githubUrl,
        details: draft.details,
        visible: draft.visible,
      }
      if (draft.id) await adminApi.updateProject(draft.id, payload)
      else await adminApi.createProject(payload)
      setNotice(draft.id ? '项目已更新' : '项目已创建')
      setDraft(empty())
      setFormOpen(false)
      setPreview(false)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('确定删除这个项目吗？')) return
    try {
      await adminApi.deleteProject(id)
      setItems((current) => current.filter((item) => item.id !== id))
      setNotice('项目已删除')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      {!formOpen && (
      <AdminPanel
        title="项目库"
        subtitle="PROJECT DATABASE"
        actions={
          <AdminButton
            variant="ghost"
            onClick={() => {
              setDraft(empty())
              setPreview(false)
              setFormOpen(true)
            }}
          >
            <Plus className="h-3 w-3" /> 新建项目
          </AdminButton>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="border border-rhine-line/70 bg-rhine-abyss/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] tracking-[0.18em] text-rhine-gold">
                  {item.code}
                </span>
                <span className="font-mono text-[8px] text-rhine-faint">{item.status}</span>
              </div>
              <h3 className="mt-2 text-sm text-rhine-ink">{item.name}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] text-rhine-dim">{item.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(from(item))
                    setPreview(false)
                    setFormOpen(true)
                  }}
                  className="font-mono text-[9px] text-rhine-cyan hover:text-rhine-gold"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="text-rhine-faint hover:text-rhine-red"
                  aria-label="删除项目"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && (
            <p className="font-mono text-[10px] text-rhine-faint">还没有项目，点击右上角新建。</p>
          )}
        </div>
      </AdminPanel>
      )}

      {formOpen && (
      <AdminPanel
        title={draft.id ? '编辑项目' : '新建项目'}
        subtitle="PROJECT FORM"
        actions={
          <>
            <AdminButton variant="ghost" onClick={() => setPreview((value) => !value)}>
              {preview ? '关闭预览' : '预览'}
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setFormOpen(false)}>
              取消
            </AdminButton>
            <AdminButton onClick={() => void save()} disabled={busy}>
              <FolderKanban className="h-3 w-3" /> {busy ? '保存中…' : '保存项目'}
            </AdminButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="项目编号 / CODE">
            <div className="border border-rhine-line bg-rhine-abyss/40 px-2 py-1.5 font-mono text-[10px] text-rhine-faint">
              {draft.code}
            </div>
          </AdminField>
          <AdminField label="项目简称 / SHORT NAME">
            <AdminInput value={draft.shortName} onChange={(e) => setDraft({ ...draft, shortName: e.target.value })} />
          </AdminField>
          <AdminField label="项目名称 / NAME">
            <AdminInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </AdminField>
          <AdminField label="类型 / TYPE">
            <AdminInput value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} placeholder="Web / Tool / Art" />
          </AdminField>
          <AdminField label="标签 / TAGS">
            <AdminInput value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="React, TypeScript" />
          </AdminField>
          <AdminField label="作者 / AUTHOR">
            <AdminInput value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
          </AdminField>
          <AdminField label="状态 / STATUS">
            <AdminSelect value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="版本 / VERSION">
            <AdminInput value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} />
          </AdminField>
          <AdminField label="GitHub 地址 / REPOSITORY">
            <AdminInput value={draft.githubUrl} onChange={(e) => setDraft({ ...draft, githubUrl: e.target.value })} placeholder="https://github.com/example/repo" />
          </AdminField>
        </div>
        <AdminField label="项目描述 / DESCRIPTION">
          <AdminTextarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
        </AdminField>
        <AdminField label="详细信息 / DETAILS（markdown）">
          <AdminTextarea value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} rows={7} />
        </AdminField>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 font-mono text-[9px] text-rhine-dim">
            <input
              type="checkbox"
              checked={draft.visible}
              onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
            />
            公开展示
          </label>
        </div>
        {preview && (
          <div className="mt-4 border border-rhine-gold/40 bg-rhine-panel/60 p-4">
            <p className="font-mono text-[9px] tracking-[0.2em] text-rhine-faint">{draft.code || 'RL-PJ-AUTO'}</p>
            <h3 className="mt-1 text-lg text-rhine-ink">{draft.name || '未命名项目'}</h3>
            <p className="mt-1 font-mono text-[10px] text-rhine-cyan">{draft.shortName || 'SHORT NAME'}</p>
            <p className="mt-2 text-xs leading-relaxed text-rhine-dim">{draft.description || '项目描述'}</p>
            <div className="mt-2 flex flex-wrap gap-2 font-mono text-[9px] text-rhine-faint">
              <span>{draft.type || 'TYPE'}</span>
              <span>· {draft.author || 'AUTHOR'}</span>
              <span>· {draft.version}</span>
            </div>
          </div>
        )}
      </AdminPanel>
      )}
    </div>
  )
}
