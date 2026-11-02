import { useEffect, useRef, useState } from 'react'
import { Download, Plus, Save, Trash2, Upload } from 'lucide-react'
import {
  errorMessage,
  siteApi,
  type HomeProfile,
  type SiteAbility,
  type SiteContact,
  type SiteLink,
} from '../../../lib/api'
import { profile as fallbackProfile } from '../../../content'
import { setSiteBrandName } from '../../../hooks/useSiteBrand'
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

const FALLBACK: HomeProfile = {
  codeName: fallbackProfile.codeName,
  realName: fallbackProfile.realName,
  roles: fallbackProfile.roles,
  intro: fallbackProfile.intro,
  dossier: fallbackProfile.dossier,
  occupation: fallbackProfile.occupation,
  affiliation: fallbackProfile.affiliation,
  status: fallbackProfile.status,
  location: fallbackProfile.location,
  specialties: fallbackProfile.specialties,
  traits: fallbackProfile.traits,
  contactEmail: '',
  github: '',
}

const STORAGE_KEY = 'rhine:home-profile'
const list = (value: string[]) => value.join(', ')
const parseList = (value: string) =>
  value.split(/[,，]/).map((item) => item.trim()).filter(Boolean)

export function ProfilePanel() {
  const [draft, setDraft] = useState<HomeProfile>(FALLBACK)
  const [abilities, setAbilities] = useState<SiteAbility[]>([])
  const [contacts, setContacts] = useState<SiteContact[]>([])
  const [links, setLinks] = useState<SiteLink[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let alive = true
    siteApi
      .home()
      .then((data) => {
        if (!alive) return
        let next = data.profile
        if (!next) {
          try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) next = JSON.parse(saved) as HomeProfile
          } catch {
            /* ignore */
          }
        }
        if (next) setDraft({ ...FALLBACK, ...next })
        if (data.abilities?.length) setAbilities(data.abilities)
        if (data.contacts?.length) setContacts(data.contacts)
        if (data.links?.length) setLinks(data.links)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const normalized = {
        ...draft,
        roles: draft.roles.filter(Boolean),
        dossier: draft.dossier.filter(Boolean),
        specialties: draft.specialties.filter(Boolean),
        traits: draft.traits.filter(Boolean),
      }
      await siteApi.saveHome({
        profile: normalized,
        abilities,
        contacts,
        links,
      })
      setSiteBrandName(normalized.codeName)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ profile: normalized, abilities, contacts, links }),
      )
      setNotice('主页资料已保存，并写入本地备份')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const exportLocal = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'rhine-home-profile.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importLocal = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<HomeProfile>
        setDraft({ ...FALLBACK, ...parsed })
        setNotice('已读取本地资料，点击保存后写回服务器')
      } catch {
        setError('本地资料格式不正确')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel
        title="主页资料"
        subtitle="ONLY ADMIN // LOCAL BACKUP"
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="ghost" onClick={exportLocal}>
              <Download className="h-3 w-3" /> 导出本地
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3" /> 导入本地
            </AdminButton>
            <AdminButton onClick={() => void save()} disabled={busy}>
              <Save className="h-3 w-3" /> {busy ? '保存中…' : '保存'}
            </AdminButton>
          </div>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) importLocal(file)
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="代号 / CODENAME">
            <AdminInput value={draft.codeName} onChange={(e) => setDraft({ ...draft, codeName: e.target.value })} />
          </AdminField>
          <AdminField label="显示名 / NAME">
            <AdminInput value={draft.realName} onChange={(e) => setDraft({ ...draft, realName: e.target.value })} />
          </AdminField>
          <AdminField label="身份 / ROLES（逗号分隔）">
            <AdminInput value={list(draft.roles)} onChange={(e) => setDraft({ ...draft, roles: parseList(e.target.value) })} />
          </AdminField>
          <AdminField label="职业 / OCCUPATION">
            <AdminInput value={draft.occupation} onChange={(e) => setDraft({ ...draft, occupation: e.target.value })} />
          </AdminField>
          <AdminField label="组织 / AFFILIATION">
            <AdminInput value={draft.affiliation} onChange={(e) => setDraft({ ...draft, affiliation: e.target.value })} />
          </AdminField>
          <AdminField label="状态 / STATUS">
            <AdminInput value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} />
          </AdminField>
          <AdminField label="位置 / LOCATION">
            <AdminInput value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          </AdminField>
          <AdminField label="联系邮箱 / EMAIL">
            <AdminInput value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} />
          </AdminField>
          <AdminField label="GitHub / LINK">
            <AdminInput value={draft.github} onChange={(e) => setDraft({ ...draft, github: e.target.value })} />
          </AdminField>
          <AdminField label="专长 / SPECIALTIES（逗号分隔）">
            <AdminInput value={list(draft.specialties)} onChange={(e) => setDraft({ ...draft, specialties: parseList(e.target.value) })} />
          </AdminField>
        </div>
        <AdminField label="简介 / INTRO">
          <AdminTextarea value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} rows={3} />
        </AdminField>
        <AdminField label="档案 / DOSSIER（每行一段）">
          <AdminTextarea
            value={draft.dossier.join('\n')}
            onChange={(e) => setDraft({ ...draft, dossier: e.target.value.split('\n').filter(Boolean) })}
            rows={5}
          />
        </AdminField>
        <AdminField label="特性 / TRAITS（逗号分隔）">
          <AdminInput value={list(draft.traits)} onChange={(e) => setDraft({ ...draft, traits: parseList(e.target.value) })} />
        </AdminField>
        <AdminField label="能力模块 / ABILITY CARDS">
          <div className="grid gap-3 md:grid-cols-2">
            {abilities.map((item, index) => (
              <div key={`${item.id}-${index}`} className="space-y-2 border border-rhine-line/70 bg-rhine-abyss/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-rhine-gold">ABILITY {index + 1}</span>
                  <button type="button" onClick={() => setAbilities((prev) => prev.filter((_, i) => i !== index))} className="text-rhine-faint hover:text-rhine-red" aria-label="删除能力">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AdminInput value={item.code} onChange={(e) => setAbilities((prev) => prev.map((row, i) => (i === index ? { ...row, code: e.target.value } : row)))} placeholder="编号" />
                  <AdminInput value={item.name} onChange={(e) => setAbilities((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="名称" />
                  <AdminInput value={item.nameEn} onChange={(e) => setAbilities((prev) => prev.map((row, i) => (i === index ? { ...row, nameEn: e.target.value } : row)))} placeholder="English" />
                  <AdminInput value={item.level} type="number" min={0} max={100} onChange={(e) => setAbilities((prev) => prev.map((row, i) => (i === index ? { ...row, level: Number(e.target.value) } : row)))} placeholder="熟练度" />
                  <AdminSelect value={item.grade} onChange={(e) => setAbilities((prev) => prev.map((row, i) => (i === index ? { ...row, grade: e.target.value as 'S' | 'A' | 'B' } : row)))}>
                    <option value="S">S</option><option value="A">A</option><option value="B">B</option>
                  </AdminSelect>
                  <AdminSelect value={item.icon} onChange={(e) => setAbilities((prev) => prev.map((row, i) => (i === index ? { ...row, icon: e.target.value as typeof item.icon } : row)))}>
                    {['code', 'design', 'research', 'game', 'data', 'music'].map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                  </AdminSelect>
                </div>
                <AdminTextarea value={item.desc} rows={2} onChange={(e) => setAbilities((prev) => prev.map((row, i) => (i === index ? { ...row, desc: e.target.value } : row)))} placeholder="描述" />
              </div>
            ))}
          </div>
        </AdminField>
        <AdminButton variant="ghost" className="mt-2" onClick={() => setAbilities((prev) => [...prev, { id: `ability-${Date.now()}`, code: '', name: '', nameEn: '', desc: '', level: 50, grade: 'B', icon: 'code' }])}>
          <Plus className="h-3 w-3" /> 添加能力
        </AdminButton>

        <AdminField label="联系方式 / CONTACT CARDS">
          <div className="grid gap-3 md:grid-cols-2">
            {contacts.map((item, index) => (
              <div key={`${item.id}-${index}`} className="space-y-2 border border-rhine-line/70 bg-rhine-abyss/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-rhine-cyan">CONTACT {index + 1}</span>
                  <button type="button" onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))} className="text-rhine-faint hover:text-rhine-red" aria-label="删除联系方式">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AdminInput value={item.label} onChange={(e) => setContacts((prev) => prev.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)))} placeholder="名称" />
                  <AdminInput value={item.labelEn} onChange={(e) => setContacts((prev) => prev.map((row, i) => (i === index ? { ...row, labelEn: e.target.value } : row)))} placeholder="English" />
                  <AdminInput value={item.value} onChange={(e) => setContacts((prev) => prev.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)))} placeholder="显示账号" />
                  <AdminInput value={item.href} onChange={(e) => setContacts((prev) => prev.map((row, i) => (i === index ? { ...row, href: e.target.value } : row)))} placeholder="跳转链接" />
                  <AdminSelect value={item.icon} onChange={(e) => setContacts((prev) => prev.map((row, i) => (i === index ? { ...row, icon: e.target.value as typeof item.icon } : row)))}>
                    {['github', 'bilibili', 'mail', 'music', 'chat'].map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                  </AdminSelect>
                  <AdminInput value={item.note ?? ''} onChange={(e) => setContacts((prev) => prev.map((row, i) => (i === index ? { ...row, note: e.target.value } : row)))} placeholder="备注" />
                </div>
              </div>
            ))}
          </div>
        </AdminField>
        <AdminButton variant="ghost" className="mt-2" onClick={() => setContacts((prev) => [...prev, { id: `contact-${Date.now()}`, label: '', labelEn: '', value: '', href: '', icon: 'chat', note: '' }])}>
          <Plus className="h-3 w-3" /> 添加联系方式
        </AdminButton>

        <AdminField label="外部链接 / LINK CARDS">
          <div className="grid gap-3 md:grid-cols-2">
            {links.map((item, index) => (
              <div key={`${item.id}-${index}`} className="space-y-2 border border-rhine-line/70 bg-rhine-abyss/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-rhine-gold">LINK {index + 1}</span>
                  <button type="button" onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))} className="text-rhine-faint hover:text-rhine-red" aria-label="删除链接">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AdminInput value={item.label} onChange={(e) => setLinks((prev) => prev.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)))} placeholder="名称" />
                  <AdminInput value={item.note ?? ''} onChange={(e) => setLinks((prev) => prev.map((row, i) => (i === index ? { ...row, note: e.target.value } : row)))} placeholder="备注" />
                  <AdminInput value={item.href} onChange={(e) => setLinks((prev) => prev.map((row, i) => (i === index ? { ...row, href: e.target.value } : row)))} placeholder="链接" />
                </div>
              </div>
            ))}
          </div>
        </AdminField>
        <AdminButton variant="ghost" className="mt-2" onClick={() => setLinks((prev) => [...prev, { id: `link-${Date.now()}`, label: '', href: '', note: '' }])}>
          <Plus className="h-3 w-3" /> 添加链接
        </AdminButton>
        <p className="mt-3 font-mono text-[9px] leading-relaxed text-rhine-faint">
          数据保存到 MySQL，同时在本浏览器的 localStorage 留一份备份；换电脑可用“导出 / 导入本地”迁移。
          主页与后台共享的字段会自动同步。
        </p>
      </AdminPanel>
    </div>
  )
}
