import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { ProjectCard } from '../components/home/ProjectsSection'
import { GlowButton, SectionTitle } from '../components/ui'
import { projects } from '../content'
import { stagger, viewportOnce } from '../lib/motion'

export function ProjectsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-28 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          index="DB"
          en="PROJECT DATABASE"
          zh="项目库"
          className="flex-1"
        />
        <span className="font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
          TOTAL: {String(projects.length).padStart(2, '0')}
        </span>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mt-10 grid gap-5 md:grid-cols-2"
      >
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} index={i} />
        ))}
      </motion.div>

      <p className="mt-8 text-center font-mono text-[11px] tracking-wider text-rhine-faint">
        ※ 项目数据在 src/content/projects.ts 中维护，新增条目会自动出现在这里与首页。
      </p>

      <div className="mt-10 flex justify-center">
        <GlowButton to="/" variant="ghost">
          <ArrowLeft className="h-3.5 w-3.5" /> 返回首页 RETURN
        </GlowButton>
      </div>
    </main>
  )
}
