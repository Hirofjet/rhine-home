import { ModulePlaceholder } from '../components/layout/ModulePlaceholder'
import { archiveSlots } from '../content/slots'

export function ArchivePage() {
  return (
    <ModulePlaceholder
      code="RL-EXT-01"
      titleEn="ARCHIVE DATABASE"
      titleZh="档案库"
      description="这里是预留的「档案库」模块：未来会存放文章、生活vlog、照片、读书笔记等长内容。"
      slots={archiveSlots}
    />
  )
}
