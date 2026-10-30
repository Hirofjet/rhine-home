import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import type { Project, ProjectStatus } from '../../content'
import { projects } from '../../content'
import { cx } from '../../lib/cx'
import { fadeUp, stagger, viewportOnce } from '../../lib/motion'
import { GlowButton, SectionTitle, StatusDot, Tag } from '../ui'
import type { DotColor } from '../ui/StatusDot'

const STATUS_STYLE: Record<
  ProjectStatus,
  { dot: DotColor; cls: string }
> = {
  ACTIVE: { dot: 'green', cls: 'border-rhine-green/40 text-rhine-green' },
  'IN PROGRESS': { dot: 'gold', cls: 'border-rhine-gold/40 text-rhine-gold' },
  COMPLETED: { dot: 'cyan', cls: 'border-rhine-cyan/40 text-rhine-cyan' },
  ARCHIVED: { dot: 'red', cls: 'border-rhine-red/40 text-rhine-red' },
}

/** 项目卡片：首页与「项目库」页面共用 */
export function ProjectCard({
  project,
  index,
}: {
  project: Project
  index: number
}) {
  const st = STATUS_STYLE[project.status]
  return (
    <motion.article
      variants={fadeUp}
      className="group relative flex h-full flex-col overflow-hidden border border-rhine-line bg-rhine-panel/85 transition-all duration-300 hover:-translate-y-1 hover:border-rhine-gold/50 hover:shadow-[0_10px_36px_rgb(0_0_0/0.45)]"
    >
      {/* 悬停扫描条 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-16 -translate-y-full bg-gradient-to-b from-transparent via-rhine-gold/10 to-transparent transition-transform duration-700 group-hover:translate-y-[280px]"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] tracking-[0.2em] text-rhine-gold">
            {project.code}
          </span>
          <span
            className={cx(
              'flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9px] tracking-[0.2em]',
              st.cls,
            )}
          >
            <StatusDot color={st.dot} className="scale-75" />
            {project.status}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-medium text-rhine-ink">
          {project.title}
        </h3>
        <p className="mt-0.5 font-mono text-[10px] tracking-[0.25em] text-rhine-faint">
          {project.subtitle}
        </p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-rhine-dim">
          {project.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-rhine-line/60 pt-3">
          <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
            NO.{String(index + 1).padStart(2, '0')}
          </span>
          {project.link ? (
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] text-rhine-gold transition-colors hover:text-rhine-ink"
            >
              查看详情
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ) : (
            <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] text-rhine-faint">
              待接入 <Plus className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export function ProjectsSection() {
  return (
    <section id="projects" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            index="03"
            en="PROJECT ARCHIVE"
            zh="项目档案"
            className="flex-1"
          />
          <span className="hidden font-mono text-[10px] tracking-[0.25em] text-rhine-faint sm:block">
            RECORDS: {String(projects.length).padStart(2, '0')}
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

        <div className="mt-10 flex justify-center">
          <GlowButton to="/projects" variant="ghost">
            进入项目库 PROJECT DB
            <ArrowRight className="h-3.5 w-3.5" />
          </GlowButton>
        </div>
      </div>
    </section>
  )
}
