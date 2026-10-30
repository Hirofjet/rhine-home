import { AlertTriangle } from 'lucide-react'
import { GlowButton } from '../components/ui'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 pb-20 pt-28">
      <div className="w-full max-w-md border border-rhine-line bg-rhine-panel/85 p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center border border-rhine-red/50 bg-rhine-red/5 text-rhine-red">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-glow-gold mt-5 font-display text-5xl font-bold tracking-[0.2em] text-rhine-gold">
          404
        </p>
        <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-rhine-dim">
          SIGNAL LOST · PAGE NOT FOUND
        </p>
        <p className="mt-2 text-sm text-rhine-dim">页面不存在，或该区块尚未接入。</p>
        <div className="mt-7 flex justify-center">
          <GlowButton to="/" variant="ghost">
            返回首页 RETURN
          </GlowButton>
        </div>
      </div>
    </main>
  )
}
