import { useEffect, useState } from 'react'

/**
 * 滚动高亮：返回当前视口所处的区块 id。
 * sectionIds 请传模块级常量数组。
 */
export function useActiveSection(sectionIds: string[]): string {
  const [active, setActive] = useState(sectionIds[0] ?? '')

  useEffect(() => {
    const onScroll = () => {
      const probe = window.scrollY + 160
      let current = sectionIds[0] ?? ''
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= probe) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sectionIds])

  return active
}
