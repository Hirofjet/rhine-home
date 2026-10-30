import { ModulePlaceholder } from '../components/layout/ModulePlaceholder'

export function ArchivePage() {
  return (
    <ModulePlaceholder
      code="RL-EXT-01"
      titleEn="ARCHIVE DATABASE"
      titleZh="档案库"
      description="这里是预留的「档案库」模块：未来可以存放文章、随笔、设定集、读书笔记等长内容。页面骨架已就绪，接入内容时只需替换本页面的占位组件。"
      slots={['文章 / 随笔集', '设定集与世界观', '照片与回忆录', '待定内容…']}
    />
  )
}
