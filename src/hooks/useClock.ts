import { useEffect, useState } from 'react'

/** 实时时钟：返回 HH:mm:ss 字符串，每秒刷新 */
export function useClock(timeZone?: string): string {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return now.toLocaleTimeString('zh-CN', {
    hour12: false,
    timeZone,
  })
}
