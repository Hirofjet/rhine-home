import { ModulePlaceholder } from '../components/layout/ModulePlaceholder'

export function LabPage() {
  return (
    <ModulePlaceholder
      code="RL-EXT-02"
      titleEn="LAB"
      titleZh="实验室"
      description="这里是预留的「实验室」模块：未来可以放博客、实验性小工具、开发备忘录等一切还在孵化中的内容。"
      slots={['博客 / 实验日志', '小工具与玩具', '开发备忘录', '待定内容…']}
    />
  )
}
