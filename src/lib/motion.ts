import type { Variants } from 'framer-motion'

/** 通用淡入上移动画 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
}

/** 子元素交错入场 */
export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

/** 进入视口触发一次的通用配置 */
export const viewportOnce = { once: true, margin: '-80px' } as const
