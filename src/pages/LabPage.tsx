import { ModulePlaceholder } from '../components/layout/ModulePlaceholder'
import { labSlots } from '../content/slots'

export function LabPage() {
  return (
    <ModulePlaceholder
      code="RL-EXT-02"
      titleEn="LAB"
      titleZh="实验室"
      description="这里是预留的「实验室」模块：未来会放博客、实验性小工具、开发备忘录等一切还在孵化中的内容。"
      slots={labSlots}
    />
  )
}
