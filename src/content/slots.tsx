/* ============================================================
   槽位模块（SLOT）类型与空数据源
   档案内容全部由后台发布后读取；不再内置示例文章/照片/视频。
   ============================================================ */

import type { ReactNode } from 'react'

export interface SlotDetailItem {
  label: string
  value: string
}

export interface SlotContent {
  paragraphs?: string[]
  items?: SlotDetailItem[]
  link?: { label: string; href: string }
  custom?: ReactNode
}

export interface SlotModule {
  id: string
  label: string
  labelEn?: string
  summary?: string
  content?: SlotContent
}

/** 档案库默认没有任何已发布内容。 */
export const archiveSlots: SlotModule[] = []
