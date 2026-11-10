/**
 * 前台内容本地缓存。
 *
 * 内容页的数据变化不频繁，但每次进入都带时间戳请求会绕过 HTTP 缓存。
 * 这里用 localStorage 做短 TTL 缓存，并在后台更新内容后主动失效。
 */
const PREFIX = 'rhine:content:v1:'
const MAX_AGE = 5 * 60 * 1000
const memory = new Map<string, { at: number; data: unknown }>()

type CacheEntry<T> = { at: number; data: T }

function read<T>(key: string): CacheEntry<T> | null {
  const mem = memory.get(key) as CacheEntry<T> | undefined
  if (mem) return mem
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (!parsed || typeof parsed.at !== 'number') return null
    memory.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

function write<T>(key: string, data: T) {
  const entry = { at: Date.now(), data }
  memory.set(key, entry)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    /* 容量不足时仅使用内存缓存 */
  }
}

export function invalidateContentCache() {
  memory.clear()
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

/** 同步读取上一次成功缓存，用于首屏避免空白（不判断 TTL）。 */
export function readCachedContent<T>(key: string): T | null {
  return read<T>(key)?.data ?? null
}

/**
 * fresh：直接返回本地数据。
 * stale：重新请求；请求失败时回退旧数据。
 * miss：请求接口并写入缓存。
 */
export async function cachedContent<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAge = MAX_AGE,
): Promise<T> {
  const cached = read<T>(key)
  if (cached && Date.now() - cached.at < maxAge) return cached.data
  try {
    const data = await fetcher()
    // 空数组通常是后端启动/迁移中的临时结果，缓存后会造成 5 分钟空白。
    if (!Array.isArray(data) || data.length > 0) write(key, data)
    return data
  } catch (error) {
    if (cached) return cached.data
    throw error
  }
}
