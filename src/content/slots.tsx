/* ============================================================
   槽位模块（SLOT）内容 —— 「档案库」页面的模块网格数据
   ------------------------------------------------------------
   交互说明：
   · 面板从「被点击模块所在行」顶部向下展开：第三排不会盖住前两排，
     第四排不会盖住前三排；收回时缩回自己所在的角；
   · 增加槽位：直接在数组里追加一项即可 —— 行数与展开方向自动适配。
   ------------------------------------------------------------
   隐藏内容怎么填：
   · 普通内容：paragraphs（段落）/ items（键值行）/ link（外链）
   · 富内容组件（文章 / 视频 / 照片时间线）放在 content.custom 里：
       <ArticleBlock file="/src/assets/articles/xxx.md" title="标题" tags={['标签']} />
       <VideoBlock src="" title="标题" tags={['标签']} />
       <PhotoTimeline />
     —— 文章 markdown 放在 src/assets/articles/，照片放在 src/assets/photos/，
        视频放在 public/videos/。
   ============================================================ */

import type { ReactNode } from 'react'
import { ArticleBlock, PhotoTimeline, VideoBlock } from '../components/slots/content'

export interface SlotDetailItem {
  label: string
  value: string
}

export interface SlotContent {
  /** 正文段落 */
  paragraphs?: string[]
  /** 键值行（会渲染成虚线引导的档案式列表） */
  items?: SlotDetailItem[]
  /** 右下角外链按钮 */
  link?: { label: string; href: string }
  /** 富内容（文章 / 视频 / 照片时间线等组件） */
  custom?: ReactNode
}

export interface SlotModule {
  /** 唯一 id（也用于展开动画定位） */
  id: string
  /** 模块名（卡片与面板标题） */
  label: string
  /** 英文小字 */
  labelEn?: string
  /** 卡片上的一行摘要 */
  summary?: string
  /** 展开后的隐藏内容 —— 以后主要在这里填 */
  content?: SlotContent
}

/** 档案库页面的槽位 */
export const archiveSlots: SlotModule[] = [
  {
    id: 'articles',
    label: '文章',
    labelEn: 'ARTICLES',
    summary: 'Markdown 文章列表',
    content: {
      custom: (
        <div className="space-y-4">
          <ArticleBlock
            file="/src/assets/articles/sample-article.md"
            title="示例文章：Markdown 全功能展示"
            date="2026-10-31"
            tags={['示例', 'Markdown']}
          />
          <ArticleBlock title="待接入文章" tags={['待填写']} />
        </div>
      ),
    },
  },
  {
    id: 'vlog',
    label: '生活vlog与视频',
    labelEn: 'VLOG',
    summary: '视频合集',
    content: {
      custom: (
        <div className="space-y-4">
          <VideoBlock
            title="待接入视频"
            description="视频文件放到 public/videos/，把 src 填成 /videos/xxx.mp4"
            tags={['待填写']}
          />
        </div>
      ),
    },
  },
  {
    id: 'photos',
    label: '照片与回忆录',
    labelEn: 'PHOTOS',
    summary: '按拍摄时间排序的照片时间线',
    content: {
      custom: <PhotoTimeline />,
    },
  },
  {
    id: 'reserved',
    label: '待定内容…',
    labelEn: 'RESERVED',
    summary: '预留槽位：想好之后再扩展',
    content: {
      paragraphs: [
        '这是一个预留槽位。想好要放什么之后，在 src/content/slots.tsx 里改掉它。',
      ],
    },
  },
]
