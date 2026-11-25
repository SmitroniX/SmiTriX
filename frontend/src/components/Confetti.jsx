import { useEffect, useRef } from 'react'

// GymMane dual-cannon confetti physics (celebration.dart):
// Fires from bottom-left and bottom-right corners with exponential air drag,
// gravity, lateral sway, and 3D flip tumbling.
const DEFAULT_COLORS = ['#D9A184', '#8FA377', '#E8CF98', '#FFFFFF', '#A78BDA', '#9CC2E8', '#E6A4B9']

export default function Confetti({ duration = 3400, colors = DEFAULT_COLORS }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext?.('2d')
    if (!ctx) return
    const parent = canvas.parentElement || document.body
    const W = (canvas.width = parent.clientWidth || window.innerWidth || 390)
    const H = (canvas.height = Math.max(320, parent.clientHeight || window.innerHeight || 640))

    const bits = []
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 34; i++) {
        const angle = ((62 + Math.random() * 24) * Math.PI) / 180
        const speed = 1150 + Math.random() * 620
        bits.push({
          left: side === 0,
          vx: Math.cos(angle) * speed * (side === 0 ? 1 : -1),
          vy: -Math.sin(angle) * speed,
          delay: Math.random() * 0.14,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: Math.floor(Math.random() * 3),
          size: 0.8 + Math.random() * 0.55,
          spin: (Math.random() - 0.5) * 9,
          flip: 5 + Math.random() * 7,
          phase: Math.random() * Math.PI * 2,
          sway: 10 + Math.random() * 22,
        })
      }
    }

    const K = 2.7
    const G = 760
    const durSec = duration / 1000
    let animId
    const startTime = performance.now()

    const render = now => {
      const total = (now - startTime) / 1000
      if (total > durSec) {
        ctx.clearRect(0, 0, W, H)
        return
      }
      ctx.clearRect(0, 0, W, H)
      const fade = Math.max(0, Math.min(1, (durSec - total) / 0.9))

      for (const b of bits) {
        const t = total - b.delay
        if (t <= 0) continue
        const decay = (1 - Math.exp(-K * t)) / K
        const x0 = b.left ? -6 : W + 6
        const y0 = H * 0.92
        const settle = Math.min(1, t * 1.4)
        const x = x0 + b.vx * decay + Math.sin(t * 3.2 + b.phase) * b.sway * settle
        const y = y0 + (G / K) * t + (b.vy - G / K) * decay
        if (y > H + 30) continue

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(b.spin * t + b.phase)
        ctx.scale(1, Math.cos(b.flip * t + b.phase))
        ctx.fillStyle = b.color
        ctx.globalAlpha = 0.92 * fade
        if (b.shape === 0) {
          ctx.fillRect(-4 * b.size, -2.5 * b.size, 8 * b.size, 5 * b.size)
        } else if (b.shape === 1) {
          ctx.fillRect(-6 * b.size, -1.3 * b.size, 12 * b.size, 2.6 * b.size)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, 2.8 * b.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [duration, colors])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}
