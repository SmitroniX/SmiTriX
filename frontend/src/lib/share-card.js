// Generate high-resolution, aesthetic social share cards for completed workouts (1080x1350 vertical format).
import { fmtNum } from './format.js'

export async function generateShareCard({ duration, volume, sets, workSets, prs = [], unit = 'kg', name = 'Workout', date = '' }) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background deep dark gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#0a0d14')
  bgGrad.addColorStop(0.5, '#121722')
  bgGrad.addColorStop(1, '#080a0f')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Subtle ambient glow circles
  const glowGrad = ctx.createRadialGradient(W * 0.5, H * 0.25, 20, W * 0.5, H * 0.25, 450)
  glowGrad.addColorStop(0, 'rgba(48, 209, 88, 0.12)')
  glowGrad.addColorStop(1, 'rgba(48, 209, 88, 0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, W, H)

  // Top accent line
  const barGrad = ctx.createLinearGradient(0, 0, W, 0)
  barGrad.addColorStop(0, '#30d158')
  barGrad.addColorStop(0.5, '#0a84ff')
  barGrad.addColorStop(1, '#30d158')
  ctx.fillStyle = barGrad
  ctx.fillRect(0, 0, W, 8)

  // Brand header
  ctx.fillStyle = '#30d158'
  ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('⚡ SmiTriX', W / 2, 90)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 60px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  ctx.fillText('Workout Complete!', W / 2, 175)

  // Routine name
  ctx.fillStyle = 'rgba(235, 235, 245, 0.7)'
  ctx.font = '500 34px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
  const displayTitle = name || 'Session'
  const subtitle = date ? `${displayTitle} · ${date}` : displayTitle
  ctx.fillText(subtitle, W / 2, 230)

  // 4 Metric cards (2x2 grid)
  const stats = [
    { label: 'DURATION', val: duration || '—', icon: '⏱️' },
    { label: 'VOLUME', val: `${fmtNum(volume)} ${unit}`, icon: '⚡' },
    { label: 'TOTAL SETS', val: `${sets} sets (${workSets} work)`, icon: '📊' },
    { label: 'PRs SET', val: prs.length > 0 ? `${prs.length} New PR!` : 'Solid Effort', icon: prs.length > 0 ? '🏆' : '💪' },
  ]

  const cardW = 440
  const cardH = 170
  const gap = 30
  const gridStartX = (W - (cardW * 2 + gap)) / 2
  const gridStartY = 300

  stats.forEach((st, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const x = gridStartX + col * (cardW + gap)
    const y = gridStartY + row * (cardH + gap)

    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.beginPath()
    ctx.roundRect(x, y, cardW, cardH, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Card label
    ctx.fillStyle = 'rgba(235, 235, 245, 0.5)'
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${st.icon} ${st.label}`, x + 28, y + 50)

    // Card value
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 38px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(st.val, x + 28, y + 115)
  })

  // PR Showcase if any
  let nextY = 720
  if (prs && prs.length > 0) {
    const prCardW = 910
    const prCardH = Math.min(320, 90 + prs.length * 48)
    const prCardX = (W - prCardW) / 2
    const prCardY = nextY

    ctx.fillStyle = 'rgba(255, 214, 10, 0.08)'
    ctx.beginPath()
    ctx.roundRect(prCardX, prCardY, prCardW, prCardH, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 214, 10, 0.35)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffd60a'
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🏆 NEW PERSONAL RECORDS', prCardX + 32, prCardY + 52)

    ctx.fillStyle = '#ffffff'
    ctx.font = '500 26px -apple-system, BlinkMacSystemFont, sans-serif'
    prs.slice(0, 5).forEach((item, i) => {
      const text = typeof item === 'string' ? item : item.name || item.id
      ctx.fillText(`• ${text}`, prCardX + 36, prCardY + 96 + i * 44)
    })

    nextY = prCardY + prCardH + 40
  } else {
    nextY = 740
  }

  // Inspirational quote / footer note
  ctx.fillStyle = 'rgba(235, 235, 245, 0.4)'
  ctx.font = 'italic 400 26px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('“Consistency is what transforms average into excellence.”', W / 2, 1180)

  // App footer
  ctx.fillStyle = 'rgba(235, 235, 245, 0.35)'
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('TRACKED WITH SMITRIX · NO ADS, NO SUBSCRIPTIONS', W / 2, 1260)

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
}
