import { useEffect, useRef } from 'react'

/** 鼠标尾迹：细小的金/青粒子，跟随指针淡出（仅桌面、尊重减少动态偏好） */
export function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (!window.matchMedia('(pointer: fine)').matches) return undefined
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    let points: Array<{ x: number; y: number; life: number }> = []
    let frame = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const onMove = (event: PointerEvent) => {
      points.push({ x: event.clientX, y: event.clientY, life: 1 })
      if (points.length > 28) points.shift()
    }

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      points.forEach((point, index) => {
        point.life *= 0.94
        const alpha = Math.max(0, point.life) * (index / Math.max(points.length, 1)) * 0.6
        context.beginPath()
        context.arc(point.x, point.y, 1 + index * 0.12, 0, Math.PI * 2)
        context.fillStyle =
          index % 2 === 0
            ? `rgba(211, 178, 122, ${alpha})`
            : `rgba(99, 212, 220, ${alpha})`
        context.fill()
      })
      points = points.filter((point) => point.life > 0.02)
      frame = window.requestAnimationFrame(draw)
    }

    draw()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('resize', resize)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5]"
    />
  )
}
