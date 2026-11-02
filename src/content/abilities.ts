/* ============================================================
   能力模块 —— 「能力模块」区块的数据源
   新增一行 = 页面多一张能力卡片；icon 可选值见 AbilityIcon
   ============================================================ */

export type AbilityIcon =
  | 'code'
  | 'design'
  | 'research'
  | 'game'
  | 'data'
  | 'music'

export type AbilityGrade = 'S' | 'A' | 'B'

export interface AbilityModule {
  /** 唯一 id */
  id: string
  /** 模块编号（面板小字） */
  code: string
  /** 模块名（中文） */
  name: string
  /** 模块名（英文小字） */
  nameEn: string
  /** 模块描述 */
  desc: string
  /** 熟练度 0-100 */
  level: number
  /** 评级 */
  grade: AbilityGrade
  /** 图标（对应 lucide 图标映射，见 AbilitiesSection.tsx 的 ICONS） */
  icon: AbilityIcon
}

export const abilityModules: AbilityModule[] = []
