import { motion } from 'framer-motion'
import { ProjectCard } from '../components/home/ProjectsSection'
import { useSiteProjects } from '../hooks/useSiteProjects'
import { stagger, viewportOnce } from '../lib/motion'

export function ProjectsPage() {
  const projects = useSiteProjects()
  return (
    <main className="w-full pb-16">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="grid gap-5 md:grid-cols-2"
      >
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} index={i} />
        ))}
      </motion.div>
      {projects.length === 0 && (
        <p className="mt-10 border border-dashed border-rhine-line/70 px-4 py-8 text-center font-mono text-[10px] tracking-wider text-rhine-faint">
          暂无已发布项目
        </p>
      )}
    </main>
  )
}
