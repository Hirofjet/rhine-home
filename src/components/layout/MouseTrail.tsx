import { useEffect, useRef } from 'react'
import { useTheme, type ThemeId } from '../theme/ThemeProvider'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  decay: number
  color: string
  spin: number
  angle: number
}

const THEME_TRAIL: Record<
  ThemeId,
  { colors: string[]; shape: 'dust' | 'pixel' | 'petal'; halo: string }
> = {
  rhine: {
    colors: ['#d3b27a', '#63d4dc', '#f2e4c6'],
    shape: 'dust',
    halo: 'rgba(211, 178, 122, 0.45)',
  },
  archive: {
    colors: ['#2f8fe8', '#ff7fae', '#ffffff'],
    shape: 'pixel',
    halo: 'rgba(47, 143, 232, 0.45)',
  },
  sakura: {
    colors: ['#f05d9d', '#a77cff', '#ffffff'],
    shape: 'petal',
    halo: 'rgba(240, 93, 157, 0.4)',
  },
  noctis: {
    colors: ['#9a86ff', '#3cf0c8', '#e8e0ff'],
    shape: 'dust',
    halo: 'rgba(154, 134, 255, 0.5)',
  },
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

/** 主题化鼠标拖尾：莱茵星尘、千年像素、樱色花瓣 */
export function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const { theme } = useTheme()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (!window.matchMedia('(pointer: fine)').matches) return undefined
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    const palette = THEME_TRAIL[theme]
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let particles: Particle[] = []
    let frame = 0
    let lastX = pointerRef.current.x
    let lastY = pointerRef.current.y
    let pointerX = lastX
    let pointerY = lastY
    let haloX = lastX
    let haloY = lastY
    let visible = !document.hidden

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const spawn = (x: number, y: number, force = 1) => {
      const count = Math.random() > 0.45 ? 2 : 1
      for (let index = 0; index < count * force; index += 1) {
        const color = palette.colors[Math.floor(Math.random() * palette.colors.length)]
        particles.push({
          x,
          y,
          vx: randomBetween(-0.9, 0.9),
          vy: randomBetween(-0.9, 0.4),
          size:
            palette.shape === 'pixel'
              ? randomBetween(1.5, 3.6)
              : randomBetween(1.2, 3.2),
          life: 1,
          decay: randomBetween(0.014, 0.032),
          color,
          spin: randomBetween(-0.12, 0.12),
          angle: randomBetween(0, Math.PI),
        })
      }
      if (particles.length > 46) particles.splice(0, particles.length - 46)
    }

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      pointerRef.current = { x: pointerX, y: pointerY }
      const distance = Math.hypot(pointerX - lastX, pointerY - lastY)
      if (distance > 2.5) {
        spawn(pointerX, pointerY, distance > 24 ? 2 : 1)
        lastX = pointerX
        lastY = pointerY
      }
    }

    const drawParticle = (particle: Particle) => {
      const alpha = Math.max(0, particle.life)
      context.globalAlpha = alpha * 0.9
      context.fillStyle = particle.color

      if (palette.shape === 'pixel') {
        context.save()
        context.translate(particle.x, particle.y)
        context.rotate(particle.angle * 0.25)
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)
        context.restore()
        return
      }

      if (palette.shape === 'petal') {
        context.save()
        context.translate(particle.x, particle.y)
        context.rotate(particle.angle)
        context.beginPath()
        context.ellipse(0, 0, particle.size, particle.size * 0.52, 0, 0, Math.PI * 2)
        context.fill()
        context.restore()
        return
      }

      context.beginPath()
      context.arc(particle.x, particle.y, particle.size * 0.6, 0, Math.PI * 2)
      context.fill()
    }

    const draw = () => {
      if (!visible) {
        frame = window.requestAnimationFrame(draw)
        return
      }
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
      context.globalCompositeOperation = 'lighter'

      haloX += (pointerX - haloX) * 0.12
      haloY += (pointerY - haloY) * 0.12
      const haloRadius = 12 + Math.sin(performance.now() / 340) * 2
      context.beginPath()
      context.arc(haloX, haloY, haloRadius, 0, Math.PI * 2)
      context.strokeStyle = palette.halo
      context.lineWidth = 1
      context.stroke()
      context.beginPath()
      context.arc(haloX, haloY, 2.2, 0, Math.PI * 2)
      context.fillStyle = palette.halo
      context.fill()

      if (palette.shape !== 'pixel') {
        context.beginPath()
        context.moveTo(haloX - 18, haloY)
        context.lineTo(haloX - 8, haloY)
        context.moveTo(haloX + 8, haloY)
        context.lineTo(haloX + 18, haloY)
        context.strokeStyle = palette.halo
        context.globalAlpha = 0.5
        context.stroke()
        context.globalAlpha = 1
      }

      particles = particles.filter((particle) => particle.life > 0.02)
      for (const particle of particles) {
        particle.life -= particle.decay
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += palette.shape === 'petal' ? 0.02 : -0.006
        particle.vx *= 0.985
        particle.angle += particle.spin
        if (palette.shape === 'petal') {
          particle.x += Math.sin(performance.now() / 500 + particle.y * 0.01) * 0.18
        }
        drawParticle(particle)
      }

      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
      frame = window.requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      visible = !document.hidden
    }

    draw()
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[6] mix-blend-screen"
    />
  )
}
