import { useEffect, useRef } from 'react'

const COLORS = ['#FFD700', '#FF9F0A', '#30D158', '#0A84FF', '#FF375F', '#BF5AF2', '#63E6E2']
const COUNT = 75

export default function Confetti({ duration = 3000 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const parent = canvas.parentElement || document.body
    const W = canvas.width = parent.clientWidth || 360
    const H = canvas.height = Math.max(260, parent.clientHeight || 260)

    const particles = Array.from({ length: COUNT }, () => ({
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      gravity: 0.28 + Math.random() * 0.12,
      decay: 0.98,
    }))

    let animId
    const startTime = performance.now()

    const render = (now) => {
      const elapsed = now - startTime
      if (elapsed > duration) {
        ctx.clearRect(0, 0, W, H)
        return
      }
      ctx.clearRect(0, 0, W, H)
      const alpha = Math.max(0, 1 - elapsed / duration)

      particles.forEach(p => {
        p.vy += p.gravity
        p.vx *= p.decay
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.spin

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.globalAlpha = alpha
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size)
        ctx.restore()
      })

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [duration])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  )
}
