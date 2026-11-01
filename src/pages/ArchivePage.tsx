import { ModulePlaceholder } from '../components/layout/ModulePlaceholder'
import { archiveSlots } from '../content/slots'

export function ArchivePage() {
  return (
    <ModulePlaceholder
      code="RL-EXT-01"
      titleEn="ARCHIVE DATABASE"
      titleZh="档案库"
      description="文章、照片与视频档案。"
      slots={archiveSlots}
    />
  )
}
