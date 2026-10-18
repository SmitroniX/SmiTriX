// Generate high-resolution, aesthetic social share cards for completed workouts (1080x1350 vertical format).
import { fmtNum } from './format.js'

export function renderShareCardCanvas(options = {}) {
  const {
    duration = '0:00',
    volume = 0,
    sets = 0,
    workSets = 0,
    prs = [],
    unit = 'kg',
    name = 'Workout',
    date = '',
    muscles = [],
  } = options || {}
  const W = 1080
  const H = 1350
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Helper for safe roundRect (fallback for environments without native ctx.roundRect)
  const drawRoundRect = (x, y, w, h, r = 16) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r)
      return
    }
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // 1. Background deep gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#06080e')
  bgGrad.addColorStop(0.35, '#0c1322')
  bgGrad.addColorStop(0.7, '#0f172a')
  bgGrad.addColorStop(1, '#05070c')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // 2. Ambient radial glow highlights
  // Top-left lime highlight
  const limeGlow = ctx.createRadialGradient(W * 0.25, H * 0.18, 20, W * 0.25, H * 0.18, 420)
  limeGlow.addColorStop(0, 'rgba(48, 209, 88, 0.16)')
  limeGlow.addColorStop(0.5, 'rgba(48, 209, 88, 0.05)')
  limeGlow.addColorStop(1, 'rgba(48, 209, 88, 0)')
  ctx.fillStyle = limeGlow
  ctx.fillRect(0, 0, W, H)

  // Bottom-right cyan/blue highlight
  const cyanGlow = ctx.createRadialGradient(W * 0.8, H * 0.75, 20, W * 0.8, H * 0.75, 450)
  cyanGlow.addColorStop(0, 'rgba(10, 132, 255, 0.14)')
  cyanGlow.addColorStop(0.6, 'rgba(10, 132, 255, 0.03)')
  cyanGlow.addColorStop(1, 'rgba(10, 132, 255, 0)')
  ctx.fillStyle = cyanGlow
  ctx.fillRect(0, 0, W, H)

  // 3. Top accent bar with gradient
  const barGrad = ctx.createLinearGradient(0, 0, W, 0)
  barGrad.addColorStop(0, '#30d158')
  barGrad.addColorStop(0.5, '#0a84ff')
  barGrad.addColorStop(1, '#ffd60a')
  ctx.fillStyle = barGrad
  ctx.fillRect(0, 0, W, 8)

  // 4. Brand pill badge
  const badgeW = 200
  const badgeH = 46
  const badgeX = (W - badgeW) / 2
  const badgeY = 70
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.beginPath()
  drawRoundRect(badgeX, badgeY, badgeW, badgeH, 23)
  ctx.fill()
  ctx.strokeStyle = 'rgba(48, 209, 88, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#30d158'
  ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('⚡ SMITRIX', W / 2, badgeY + 31)

  // 5. Title
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 64px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Workout Complete!', W / 2, 185)

  // 6. Routine name and date
  ctx.fillStyle = 'rgba(235, 235, 245, 0.75)'
  ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
  const displayTitle = name || 'Session'
  const subtitle = date ? `${displayTitle} · ${date}` : displayTitle
  ctx.fillText(subtitle, W / 2, 238)

  // 7. Metric cards (2x2 grid)
  const stats = [
    { label: 'DURATION', val: duration || '—', icon: '⏱️' },
    { label: 'VOLUME', val: `${fmtNum(volume)} ${unit}`, icon: '⚡' },
    { label: 'TOTAL SETS', val: `${sets} sets (${workSets} work)`, icon: '📊' },
    { label: 'PRs SET', val: prs.length > 0 ? `${prs.length} New PR!` : 'Solid Effort', icon: prs.length > 0 ? '🏆' : '💪' },
  ]

  const cardW = 440
  const cardH = 175
  const gap = 30
  const gridStartX = (W - (cardW * 2 + gap)) / 2
  const gridStartY = 295

  stats.forEach((st, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const x = gridStartX + col * (cardW + gap)
    const y = gridStartY + row * (cardH + gap)

    // Card glass background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)'
    ctx.beginPath()
    drawRoundRect(x, y, cardW, cardH, 22)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Inner subtle gradient highlight
    const cardGlow = ctx.createLinearGradient(x, y, x, y + cardH)
    cardGlow.addColorStop(0, 'rgba(255, 255, 255, 0.04)')
    cardGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = cardGlow
    ctx.beginPath()
    drawRoundRect(x, y, cardW, cardH, 22)
    ctx.fill()

    // Card label
    ctx.fillStyle = 'rgba(235, 235, 245, 0.6)'
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${st.icon}  ${st.label}`, x + 28, y + 52)

    // Card value
    ctx.fillStyle = '#ffffff'
    ctx.font = '800 36px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(st.val, x + 28, y + 118)
  })

  // 8. PR Showcase or Target Muscles Section
  let nextY = 705

  if (prs && prs.length > 0) {
    const prCardW = 910
    const prCardH = Math.min(320, 96 + prs.length * 48)
    const prCardX = (W - prCardW) / 2
    const prCardY = nextY

    // Golden metallic glowing card
    ctx.fillStyle = 'rgba(255, 214, 10, 0.07)'
    ctx.beginPath()
    drawRoundRect(prCardX, prCardY, prCardW, prCardH, 24)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 214, 10, 0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffd60a'
    ctx.font = '800 28px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🏆  NEW PERSONAL RECORDS', prCardX + 34, prCardY + 54)

    ctx.fillStyle = '#ffffff'
    ctx.font = '600 25px -apple-system, BlinkMacSystemFont, sans-serif'
    prs.slice(0, 5).forEach((item, i) => {
      const text = typeof item === 'string' ? item : item.name || item.id
      ctx.fillText(`•  ${text}`, prCardX + 38, prCardY + 100 + i * 44)
    })

    nextY = prCardY + prCardH + 35
  } else if (muscles && muscles.length > 0) {
    // Muscle tags showcase
    const mCardW = 910
    const mCardH = 130
    const mCardX = (W - mCardW) / 2
    const mCardY = nextY

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.beginPath()
    drawRoundRect(mCardX, mCardY, mCardW, mCardH, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = 'rgba(235, 235, 245, 0.5)'
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('TARGET MUSCLES', mCardX + 30, mCardY + 44)

    ctx.fillStyle = '#30d158'
    ctx.font = '700 26px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(muscles.slice(0, 5).join('  ·  '), mCardX + 30, mCardY + 92)

    nextY = mCardY + mCardH + 35
  } else {
    // Session highlight showcase when no PRs or muscles specified
    const sCardW = 910
    const sCardH = 130
    const sCardX = (W - sCardW) / 2
    const sCardY = nextY

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.beginPath()
    drawRoundRect(sCardX, sCardY, sCardW, sCardH, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = 'rgba(235, 235, 245, 0.5)'
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('SESSION HIGHLIGHT', sCardX + 30, sCardY + 44)

    ctx.fillStyle = '#30d158'
    ctx.font = '700 26px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText('All planned exercises completed with intensity & focus.', sCardX + 30, sCardY + 92)

    nextY = sCardY + sCardH + 35
  }

  // 9. Motivational quote
  ctx.fillStyle = 'rgba(235, 235, 245, 0.45)'
  ctx.font = 'italic 500 26px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('“Consistency is what transforms average into excellence.”', W / 2, 1180)

  // 10. App footer
  ctx.fillStyle = 'rgba(235, 235, 245, 0.35)'
  ctx.font = '700 22px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('TRACKED WITH SMITRIX · NO ADS, NO SUBSCRIPTIONS', W / 2, 1260)

  return canvas
}

export async function generateShareCard(options = {}) {
  const canvas = renderShareCardCanvas(options)
  if (!canvas) return null

  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(resolve, 'image/png')
    } else if (typeof canvas.toDataURL === 'function') {
      try {
        const dataUrl = canvas.toDataURL('image/png')
        const binStr = atob(dataUrl.split(',')[1])
        const len = binStr.length
        const arr = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i)
        }
        resolve(new Blob([arr], { type: 'image/png' }))
      } catch {
        resolve(null)
      }
    } else {
      resolve(null)
    }
  })
}
