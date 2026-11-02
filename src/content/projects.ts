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

export const projects: Project[] = []
