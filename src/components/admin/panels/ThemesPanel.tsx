import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { themeApi, type CustomTheme } from '../../../lib/api'

const color = (value: string) => (/^#[0-9a-f]{6}$/i.test(value) ? value : '#9a7c3f')

export function ThemesPanel({ canDelete }: { canDelete: boolean }) {
  const [themes, setThemes] = useState<CustomTheme[]>([])
  const [name, setName] = useState('')
  const [primary, setPrimary] = useState('#1a1c22')
  const [secondary, setSecondary] = useState('#d3b27a')
  const [tertiary, setTertiary] = useState('#63d4dc')
  const [primaryName, setPrimaryName] = useState('')
  const [secondaryName, setSecondaryName] = useState('')
  const [tertiaryName, setTertiaryName] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    const data = await themeApi.list().catch(() => ({ themes: [] }))
    setThemes(data.themes)
  }

  useEffect(() => {
    void load()
  }, [])

  const create = async () => {
    if (!name.trim()) return
    try {
      await themeApi.create({
        name: name.trim(),
        primaryColor: color(primary),
        primaryName: primaryName.trim(),
        secondaryColor: color(secondary),
        secondaryName: secondaryName.trim(),
        tertiaryColor: color(tertiary),
        tertiaryName: tertiaryName.trim(),
      })
      setName('')
      setMessage('主题已创建，刷新页面后进入主题列表。')
      await load()
    } catch {
      setMessage('创建失败，请确认有主题管理权限。')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-[0.1em]">主题颜色</h2>
        <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
          CUSTOM THEME PROTOCOL // 默认亮色与暗色不可删除
        </p>
      </div>

      <section className="border border-rhine-line p-4">
        <p className="font-mono text-[9px] tracking-[0.2em] text-rhine-gold">NEW THEME</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-rhine-dim">
            主题名
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border border-rhine-line bg-rhine-abyss px-3 py-2 text-sm text-rhine-ink" />
          </label>
          {[
            ['主色调', primary, setPrimary, primaryName, setPrimaryName],
            ['副色调', secondary, setSecondary, secondaryName, setSecondaryName],
            ['子色调', tertiary, setTertiary, tertiaryName, setTertiaryName],
          ].map(([label, value, setter, nameValue, nameSetter]) => (
            <div key={String(label)}>
              <label className="text-xs text-rhine-dim">
                {String(label)}
                <span className="mt-1 flex items-center gap-2">
                  <input type="color" value={String(value)} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="h-9 w-12 border border-rhine-line bg-transparent" />
                  <input value={String(value)} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="min-w-0 flex-1 border border-rhine-line bg-rhine-abyss px-2 py-2 font-mono text-xs" />
                </span>
              </label>
              <input
                value={String(nameValue)}
                onChange={(e) => (nameSetter as (v: string) => void)(e.target.value)}
                placeholder="颜色名称"
                className="mt-1 w-full border border-rhine-line bg-rhine-abyss px-2 py-1.5 font-mono text-[10px]"
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => void create()} className="mt-4 border border-rhine-gold/60 bg-rhine-gold/10 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-rhine-gold">
          CREATE THEME
        </button>
        {message && <p className="mt-3 font-mono text-[10px] text-rhine-dim">{message}</p>}
      </section>

      <section className="border border-rhine-line">
        <div className="border-b border-rhine-line px-4 py-2 font-mono text-[9px] tracking-[0.2em] text-rhine-faint">
          CUSTOM THEMES / {themes.length}
        </div>
        {themes.map((theme) => (
          <div key={theme.id} className="flex items-center gap-3 border-b border-rhine-line/50 px-4 py-3 last:border-0">
            <span className="flex h-8 w-16 overflow-hidden border border-white/10">
              {[theme.primary_color, theme.secondary_color, theme.tertiary_color].map((value) => (
                <i key={value} className="h-full flex-1" style={{ backgroundColor: value }} />
              ))}
            </span>
            <span className="flex-1 text-sm">{theme.name}</span>
            <span className="hidden font-mono text-[8px] text-rhine-faint xl:inline">
              {[theme.primary_name, theme.secondary_name, theme.tertiary_name].filter(Boolean).join(' · ')}
            </span>
            <span className="font-mono text-[9px] text-rhine-faint">custom-{theme.id}</span>
            {canDelete && (
              <button type="button" onClick={() => void themeApi.remove(theme.id).then(load)} className="text-rhine-red" aria-label="删除主题">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {themes.length === 0 && <p className="p-4 text-center font-mono text-[10px] text-rhine-faint">暂无自定义主题</p>}
      </section>
    </div>
  )
}
