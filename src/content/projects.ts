/* ============================================================
   项目档案 —— 「项目档案」区块与「项目库」页面的数据源
   新增一行 = 多一张项目卡片
   ============================================================ */

export type ProjectStatus = 'ACTIVE' | 'IN PROGRESS' | 'COMPLETED' | 'ARCHIVED'

export interface Project {
  /** 唯一 id */
  id: string
  /** 项目编号 */
  code: string
  /** 项目名（中文） */
  name?: string
  /** 项目名（中文） */
  title: string
  /** 项目名（英文小字） */
  subtitle: string
  /** 项目描述 */
  description: string
  /** 技术/内容标签 */
  tags: string[]
  /** 状态 */
  status: ProjectStatus
  /** 外链（可选） */
  link?: string
  shortName?: string
  type?: string
  author?: string
  version?: string
  githubUrl?: string
  details?: string
  createdAt?: string
  updatedAt?: string
}

export const projects: Project[] = [
  {
    id: 'rhine-home',
    code: 'RL-PJ-01',
    name: '示例项目：个人主页',
    title: '示例项目：个人主页',
    shortName: 'SAMPLE-HOME',
    subtitle: 'SAMPLE-HOME',
    description:
      '一个可自由替换内容的个人主页模板，包含开机动画、模块化面板、论坛与内容管理。',
    tags: ['React', 'Tailwind', 'Motion'],
    status: 'ACTIVE',
    type: 'Web / Personal Site',
    author: 'SAMPLE',
    version: '0.9.0',
    githubUrl: 'https://github.com/example/rhine-home',
    details:
      '技术栈：React 19 / TypeScript / Vite 8 / Tailwind CSS v4 / Framer Motion。\n支持主题切换、内容管理、权限系统、论坛、留言板与好友私信。',
    createdAt: '2026-10-30',
    updatedAt: '2026-11-02',
    link: 'https://github.com/example/rhine-home',
  },
  {
    id: 'reserved-2',
    code: 'RL-PJ-02',
    title: '项目占位 · 待补充',
    subtitle: 'RESERVED',
    description: '无。',
    tags: ['待填写'],
    status: 'ARCHIVED',
  },
  {
    id: 'reserved-3',
    code: 'RL-PJ-03',
    title: '项目占位 · 待补充',
    subtitle: 'RESERVED',
    description: '无。',
    tags: ['待填写'],
    status: 'ARCHIVED',
  },
  {
    id: 'reserved-4',
    code: 'RL-PJ-04',
    title: '项目占位 · 待补充',
    subtitle: 'RESERVED',
    description: '无。',
    tags: ['待填写'],
    status: 'ARCHIVED',
  },
]
