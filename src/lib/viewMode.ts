export type ViewMode = 'lab' | 'archive'

const KEY = 'rhine:view-mode'

export function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(KEY) === 'archive' ? 'archive' : 'lab'
  } catch {
    return 'lab'
  }
}

export function writeViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
}
