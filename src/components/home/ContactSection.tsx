import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpRight,
  Check,
  Copy,
  GitBranch,
  Mail,
  MessageCircle,
  Music,
  Tv,
} from 'lucide-react'
import type { ContactIcon } from '../../content'
import { contactLinks, emailAddress } from '../../content'
import { useCopy } from '../../hooks/useCopy'
import { cx } from '../../lib/cx'
import { fadeUp, viewportOnce } from '../../lib/motion'
import { Panel, SectionTitle } from '../ui'

const ICONS: Record<ContactIcon, LucideIcon> = {
  github: GitBranch,
  bilibili: Tv,
  mail: Mail,
  music: Music,
  chat: MessageCircle,
}

export function ContactSection() {
  const { copied, copy } = useCopy()
  const [signal, setSignal] = useState('')
  const [log, setLog] = useState<string[]>([
    '> 终端已就绪，输入讯号并按回车发送',
  ])

  const sendSignal = () => {
    const msg = signal.trim()
    if (!msg) return
    setLog((l) =>
      [...l, `> TX >> ${msg}`, '> SIGNAL RECEIVED — 讯号已接收，等待回信'].slice(
        -6,
      ),
    )
    setSignal('')
  }

  return (
    <section id="contact" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle index="04" en="COMM TERMINAL" zh="联络终端" />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* 通讯频道 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <Panel code="RL-05" title="CHANNELS" titleZh="通讯频道" className="h-full">
              <ul className="divide-y divide-rhine-line/60">
                {contactLinks.map((link) => {
                  const Icon = ICONS[link.icon]
                  return (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-4 py-3.5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-rhine-line bg-rhine-abyss-2 text-rhine-dim transition-all duration-300 group-hover:border-rhine-gold/60 group-hover:text-rhine-gold group-hover:shadow-[0_0_16px_rgb(211_178_122/0.2)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-rhine-ink">
                            {link.label}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-rhine-faint">
                            {link.value}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
                          {link.labelEn}
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-rhine-faint transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rhine-gold" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          </motion.div>

          {/* 直连线路 + 讯号终端 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <Panel
              code="RL-06"
              title="DIRECT LINE"
              titleZh="直连线路"
              accent="cyan"
              className="h-full"
            >
              <p className="font-mono text-[11px] tracking-[0.2em] text-rhine-faint">
                E-MAIL // 电子邮箱
              </p>
              <div className="mt-3 flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate font-mono text-sm text-rhine-cyan">
                  {emailAddress}
                </p>
                <button
                  type="button"
                  onClick={() => void copy(emailAddress)}
                  className={cx(
                    'flex shrink-0 items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] transition-all duration-300',
                    copied
                      ? 'border-rhine-green/60 text-rhine-green'
                      : 'border-rhine-line-2 text-rhine-dim hover:border-rhine-cyan/60 hover:text-rhine-cyan',
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> COPIED
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> COPY
                    </>
                  )}
                </button>
              </div>

              {/* 迷你讯号终端 */}
              <div className="mt-7">
                <p className="font-mono text-[11px] tracking-[0.2em] text-rhine-faint">
                  SIGNAL TERMINAL // 讯号终端
                </p>
                <div className="mt-3 h-32 overflow-y-auto border border-rhine-line bg-rhine-abyss/80 p-3 font-mono text-[11px] leading-relaxed">
                  {log.map((l, i) => (
                    <p
                      key={`${i}-${l}`}
                      className={
                        l.includes('RECEIVED')
                          ? 'text-rhine-green'
                          : l.startsWith('> TX')
                            ? 'text-rhine-cyan'
                            : 'text-rhine-dim'
                      }
                    >
                      {l}
                    </p>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-rhine-cyan">▸</span>
                  <input
                    value={signal}
                    onChange={(e) => setSignal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendSignal()
                    }}
                    placeholder="输入讯号…"
                    className="w-full bg-transparent font-mono text-xs text-rhine-ink placeholder:text-rhine-faint focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendSignal}
                    className="shrink-0 border border-rhine-cyan/50 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-rhine-cyan transition-colors hover:bg-rhine-cyan/10"
                  >
                    SEND
                  </button>
                </div>
              </div>
            </Panel>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
