import type { ThemeId } from '../components/theme/ThemeProvider'

export type LabPageTheme = 'light' | 'dark' | 'archive' | 'sakura' | 'noctis'
export type Lab3DTheme = 'light' | 'dark'

export function labPageThemeFromApp(theme: ThemeId): LabPageTheme {
  if (theme === 'rhine-dark') return 'dark'
  if (theme === 'archive' || theme === 'sakura' || theme === 'noctis') return theme
  return 'light'
}

export function appThemeFromLabPage(theme: string): ThemeId {
  if (theme === 'dark') return 'rhine-dark'
  if (theme === 'archive' || theme === 'sakura' || theme === 'noctis') return theme
  return 'rhine'
}

export function isLabPageTheme(value: unknown): value is LabPageTheme {
  return (
    value === 'light' ||
    value === 'dark' ||
    value === 'archive' ||
    value === 'sakura' ||
    value === 'noctis'
  )
}

export function isLab3DTheme(value: unknown): value is Lab3DTheme {
  return value === 'light' || value === 'dark'
}
