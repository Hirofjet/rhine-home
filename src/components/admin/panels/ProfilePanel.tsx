import { useEffect, useRef, useState } from 'react'
import { Download, Save, Upload } from 'lucide-react'
import {
  errorMessage,
  siteApi,
  type HomeProfile,
  type SiteAbility,
  type SiteContact,
  type SiteLink,
} from '../../../lib/api'
import { abilityModules, contactLinks, profile as fallbackProfile } from '../../../content'
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPanel,
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
  const [abilities, setAbilities] = useState<SiteAbility[]>(abilityModules)
  const [contacts, setContacts] = useState<SiteContact[]>(contactLinks)
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
        <AdminField label="能力模块 / JSON">
          <AdminTextarea
            value={JSON.stringify(abilities, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                if (Array.isArray(parsed)) setAbilities(parsed)
              } catch {
                /* 输入中允许暂时不合法 */
              }
            }}
            rows={6}
          />
        </AdminField>
        <AdminField label="联系方式 / JSON">
          <AdminTextarea
            value={JSON.stringify(contacts, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                if (Array.isArray(parsed)) setContacts(parsed)
              } catch {
                /* ignore */
              }
            }}
            rows={6}
          />
        </AdminField>
        <AdminField label="外部链接 / JSON">
          <AdminTextarea
            value={JSON.stringify(links, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                if (Array.isArray(parsed)) setLinks(parsed)
              } catch {
                /* ignore */
              }
            }}
            rows={4}
          />
        </AdminField>
        <p className="mt-3 font-mono text-[9px] leading-relaxed text-rhine-faint">
          数据保存到 MySQL，同时在本浏览器的 localStorage 留一份备份；换电脑可用“导出 / 导入本地”迁移。
          主页与后台共享的字段会自动同步。
        </p>
      </AdminPanel>
    </div>
  )
}
