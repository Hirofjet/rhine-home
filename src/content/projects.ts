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
}

export const projects: Project[] = [
  {
    id: 'rhine-home',
    code: 'RL-PJ-01',
    title: '本项目：菲羽猫的主页',
    subtitle: 'Hirofjet-HOME',
    description:
      '你正在浏览的这个主页。基于 React + Vite 构建，包含开机动画、模块化面板与内容配置系统。',
    tags: ['React', 'Tailwind', 'Motion'],
    status: 'ACTIVE',
    link: '/',
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
