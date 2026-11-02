import { useState } from 'react'
import { Plus } from 'lucide-react'
import { adminApi, errorMessage } from '../../../lib/api'
import { AdminButton, AdminError, AdminField, AdminInput, AdminNotice, AdminPanel, AdminTextarea } from '../AdminUi'

export function CreateForumPanel() {
  const [access, setAccess] = useState<'public' | 'special' | 'core'>('public')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('名称与 slug 必填')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.createBoard({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        access,
        tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      })
      setName('')
      setSlug('')
      setDescription('')
      setTags('')
      setNotice('论坛已创建')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel title="创建论坛" subtitle="CREATE FORUM">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="名称 / NAME">
            <AdminInput value={name} onChange={(event) => setName(event.target.value)} />
          </AdminField>
          <AdminField label="Slug / URL">
            <AdminInput value={slug} onChange={(event) => setSlug(event.target.value)} />
          </AdminField>
          <AdminField label="类别 / ACCESS">
            <select
              value={access}
              onChange={(event) => setAccess(event.target.value as typeof access)}
              className="w-full border border-rhine-line bg-rhine-abyss/70 px-3 py-2 font-mono text-xs text-rhine-ink outline-none"
            >
              <option value="public">普通论坛</option>
              <option value="special">特殊论坛</option>
              <option value="core">核心论坛</option>
            </select>
          </AdminField>
          <AdminField label="标签 / TAGS">
            <AdminInput value={tags} onChange={(event) => setTags(event.target.value)} />
          </AdminField>
        </div>
        <AdminField label="描述 / DESCRIPTION">
          <AdminTextarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </AdminField>
        <AdminButton onClick={() => void create()} disabled={busy}>
          <Plus className="h-3 w-3" /> {busy ? '创建中…' : '创建论坛'}
        </AdminButton>
      </AdminPanel>
    </div>
  )
}
