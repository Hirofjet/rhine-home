/* ============================================================
   槽位模块（SLOT）内容 —— 「档案库 / 实验室」等占位页的模块网格数据
   ------------------------------------------------------------
   交互说明：
   · 网格第一排始终可见（像标签页），展开面板覆盖第一排以下区域；
   · 模块从自身位置朝网格中心方向展开，收回时缩回自己所在的角；
   · 增加槽位：直接在数组里追加一项即可 —— 网格行数、展开方向自动适配。
   ------------------------------------------------------------
   隐藏内容怎么填：
   · 普通内容：paragraphs（段落）/ items（键值行）/ tags（标签）/ link（外链）
   · 复杂排版：把本文件改名为 slots.tsx 后使用 custom: <你的组件 />
   ============================================================ */

import type { ReactNode } from 'react'

export interface SlotDetailItem {
  label: string
  value: string
}

export interface SlotContent {
  /** 正文段落 */
  paragraphs?: string[]
  /** 键值行（会渲染成虚线引导的档案式列表） */
  items?: SlotDetailItem[]
  /** 标签 */
  tags?: string[]
  /** 右下角外链按钮 */
  link?: { label: string; href: string }
  /** 完全自定义的内容（需要 JSX 时使用） */
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
    label: '文章 / 随笔集',
    labelEn: 'ARTICLES',
    summary: '待接入：文章列表与阅读页',
    content: {
      paragraphs: [
        '这里显示模块展开后的隐藏内容。把这段文字换成你的真实内容即可。',
        '可以放文章简介、更新说明，或者任何你想让访客看到的信息。',
      ],
      items: [
        { label: '条目数', value: '待填写' },
        { label: '最近更新', value: '待填写' },
        { label: '维护方式', value: 'Markdown' },
      ],
      tags: ['待填写'],
    },
  },
  {
    id: 'vlog',
    label: '生活vlog',
    labelEn: 'VLOG',
    summary: '待接入：视频合集与播放列表',
    content: {
      paragraphs: ['这里放 vlog 合集介绍、播放列表入口或嵌入播放器。'],
      items: [
        { label: '平台', value: 'Bilibili' },
        { label: '更新频率', value: '待填写' },
      ],
      tags: ['生活', '视频'],
    },
  },
  {
    id: 'photos',
    label: '照片与回忆录',
    labelEn: 'PHOTOS',
    summary: '待接入：照片墙与时间线',
    content: {
      paragraphs: ['这里放照片墙、时间线或回忆录。'],
      items: [{ label: '照片数', value: '待填写' }],
      tags: ['照片'],
    },
  },
  {
    id: 'reserved',
    label: '待定内容…',
    labelEn: 'RESERVED',
    summary: '预留槽位：想好之后再扩展',
    content: {
      paragraphs: [
        '这是一个预留槽位。想好要放什么之后，在 src/content/slots.ts 里改掉它。',
      ],
    },
  },
]

/** 实验室页面的槽位 */
export const labSlots: SlotModule[] = [
  {
    id: 'blog',
    label: '博客 / 实验日志',
    labelEn: 'BLOG',
    summary: '待接入：日志列表与详情页',
    content: {
      paragraphs: ['这里放博客 / 实验日志的入口与简介。'],
      items: [
        { label: '日志数', value: '待填写' },
        { label: '最近更新', value: '待填写' },
      ],
      tags: ['日志'],
    },
  },
  {
    id: 'tools',
    label: '小工具与玩具',
    labelEn: 'TOOLS',
    summary: '待接入：可交互的小实验',
    content: {
      paragraphs: ['这里放小工具、实验性交互或玩具项目的入口。'],
      items: [{ label: '工具数', value: '待填写' }],
      tags: ['实验'],
    },
  },
  {
    id: 'notes',
    label: '开发备忘录',
    labelEn: 'NOTES',
    summary: '待接入：开发笔记与踩坑记录',
    content: {
      paragraphs: ['这里放开发笔记、踩坑记录或技术备忘录。'],
      items: [{ label: '条目数', value: '待填写' }],
      tags: ['开发'],
    },
  },
  {
    id: 'reserved',
    label: '待定内容…',
    labelEn: 'RESERVED',
    summary: '预留槽位：想好之后再扩展',
    content: {
      paragraphs: [
        '这是一个预留槽位。想好要放什么之后，在 src/content/slots.ts 里改掉它。',
      ],
    },
  },
]
