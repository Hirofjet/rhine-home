/* oxlint-disable react/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { themeApi } from '../../lib/api'

export type ThemeId = 'rhine' | 'rhine-dark' | 'archive' | 'sakura' | 'noctis'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  labelEn: string
  description: string
  colors: [string, string, string]
  metaColor: string
  custom?: boolean
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'rhine',
    label: '莱茵生命（亮）',
    labelEn: 'RHINE LAB LIGHT',
    description: '实验室米白 · 黑线 · 金青',
    colors: ['#e8e5e1', '#9a7c3f', '#2b7a83'],
    metaColor: '#e8e5e1',
  },
  {
    id: 'rhine-dark',
    label: '莱茵生命（暗）',
    labelEn: 'RHINE LAB DARK',
    description: '黑曜石 · 白金 · 数据青',
    colors: ['#05070b', '#d3b27a', '#63d4dc'],
    metaColor: '#05070b',
  },
  {
    id: 'archive',
    label: '碧蓝档案',
    labelEn: 'BLUE ARCHIVE',
    description: '晴空蓝 · 纯白 · 圣娅粉',
    colors: ['#f4f9ff', '#4aa8f0', '#ff8fb4'],
    metaColor: '#f4f9ff',
  },
  {
    id: 'sakura',
    label: '樱色协议',
    labelEn: 'SAKURA PROTOCOL',
    description: '樱白 · 桃粉 · 薄紫',
    colors: ['#fff6fb', '#f26fa7', '#b287ff'],
    metaColor: '#fff6fb',
  },
  {
    id: 'noctis',
    label: '深空协议',
    labelEn: 'NOCTIS',
    description: '深空紫 · 极光青 · 星辉',
    colors: ['#080511', '#9a86ff', '#3cf0c8'],
    metaColor: '#080511',
  },
]

export const THEME_STORAGE_KEY = 'rhine:theme'

const isTheme = (value: string | null): value is ThemeId =>
  value === 'rhine' ||
  value === 'rhine-dark' ||
  value === 'archive' ||
  value === 'sakura' ||
  value === 'noctis' ||
  Boolean(value?.startsWith('custom-'))

interface ThemeContextValue {
  theme: ThemeId
  definition: ThemeDefinition
  setTheme: (theme: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function initialTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) return stored
    if (isTheme(document.documentElement.dataset.theme ?? null)) {
      return document.documentElement.dataset.theme as ThemeId
    }
  } catch {
    /* localStorage 不可用时使用默认主题 */
  }
  return 'rhine'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme)
  const [revision, setRevision] = useState(0)

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
  }, [])

  useEffect(() => {
    let live = true
    themeApi
      .list()
      .then(({ themes }) => {
        if (!live) return
        for (const item of themes) {
          const id = `custom-${item.id}` as ThemeId
          const definition: ThemeDefinition = {
            id,
            label: item.name,
            labelEn: 'CUSTOM THEME',
            description: `${item.primary_color} · ${item.secondary_color} · ${item.tertiary_color}`,
            colors: [item.primary_color, item.secondary_color, item.tertiary_color],
            metaColor: item.primary_color,
            custom: true,
          }
          const index = THEMES.findIndex((entry) => entry.id === id)
          if (index >= 0) THEMES[index] = definition
          else THEMES.push(definition)
        }
        setRevision((value) => value + 1)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const definition = THEMES.find((item) => item.id === theme)
    if (definition?.custom) {
      const [primary, secondary, tertiary] = definition.colors
      const luminance = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255
      }
      const dark = luminance(primary) < 0.45
      const ink = dark ? '#f2eee5' : '#171512'
      const dim = dark ? '#b8b2a6' : '#5b554c'
      const faint = dark ? '#8a8378' : '#8a8175'
      root.style.setProperty('--color-rhine-abyss', primary)
      root.style.setProperty('--color-rhine-abyss-2', primary)
      root.style.setProperty('--color-rhine-panel', primary)
      root.style.setProperty('--color-rhine-panel-2', primary)
      root.style.setProperty('--color-rhine-line', secondary)
      root.style.setProperty('--color-rhine-line-2', secondary)
      root.style.setProperty('--color-rhine-ink', ink)
      root.style.setProperty('--color-rhine-dim', dim)
      root.style.setProperty('--color-rhine-faint', faint)
      root.style.setProperty('--color-rhine-gold', secondary)
      root.style.setProperty('--color-rhine-gold-deep', secondary)
      root.style.setProperty('--color-rhine-cyan', tertiary)
      root.style.setProperty('--theme-selection', `${secondary}33`)
    } else {
      for (const name of [
        '--color-rhine-abyss',
        '--color-rhine-abyss-2',
        '--color-rhine-panel',
        '--color-rhine-panel-2',
        '--color-rhine-line',
        '--color-rhine-line-2',
        '--color-rhine-ink',
        '--color-rhine-dim',
        '--color-rhine-faint',
        '--color-rhine-gold',
        '--color-rhine-gold-deep',
        '--color-rhine-cyan',
        '--theme-selection',
      ]) {
        root.style.removeProperty(name)
      }
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && definition) meta.setAttribute('content', definition.metaColor)

    root.classList.add('theme-switching')
    const timer = window.setTimeout(() => root.classList.remove('theme-switching'), 700)
    return () => window.clearTimeout(timer)
  }, [theme, revision])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
        setThemeState(event.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const definition = useMemo(
    () => THEMES.find((item) => item.id === theme) ?? THEMES[0],
    [theme, revision],
  )
  const value = useMemo(
    () => ({ theme, definition, setTheme }),
    [theme, definition, setTheme, revision],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
