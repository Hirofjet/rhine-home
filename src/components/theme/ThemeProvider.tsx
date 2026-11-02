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

export type ThemeId = 'rhine' | 'archive' | 'sakura' | 'noctis'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  labelEn: string
  description: string
  colors: [string, string, string]
  metaColor: string
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'rhine',
    label: '莱茵生命',
    labelEn: 'RHINE LAB',
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
  value === 'rhine' || value === 'archive' || value === 'sakura' || value === 'noctis'

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

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    const definition = THEMES.find((item) => item.id === theme)
    if (meta && definition) meta.setAttribute('content', definition.metaColor)

    root.classList.add('theme-switching')
    const timer = window.setTimeout(() => root.classList.remove('theme-switching'), 700)
    return () => window.clearTimeout(timer)
  }, [theme])

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
    [theme],
  )
  const value = useMemo(
    () => ({ theme, definition, setTheme }),
    [theme, definition, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
