/* ============================================================
   档案库槽位：卡片常驻，内容实时从后台读取
   ============================================================ */

import type { ReactNode } from 'react'
import { ArticlesFeed } from '../components/slots/content/ArticlesFeed'
import { PhotoTimeline } from '../components/slots/content/PhotoTimeline'
import { VideosFeed } from '../components/slots/content/VideosFeed'

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

export const archiveSlots: SlotModule[] = [
  {
    id: 'articles',
    label: '文章',
    labelEn: 'ARTICLES',
    summary: '已发布文章',
    content: { custom: <ArticlesFeed /> },
  },
  {
    id: 'videos',
    label: '视频',
    labelEn: 'VIDEOS',
    summary: '已发布视频',
    content: { custom: <VideosFeed /> },
  },
  {
    id: 'photos',
    label: '照片',
    labelEn: 'PHOTOS',
    summary: '照片时间线',
    content: { custom: <PhotoTimeline /> },
  },
]
