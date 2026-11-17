// SmiTriX — High-Resolution Aesthetic Social Share Cards (1080x1350 vertical format).
// Designed with authentic athletic typography, bespoke dark aesthetics, and multiple themes:
// 1. Obsidian Neon: Razor-sharp carbon-dark athletic aesthetic with electric lime/cyan accents.
// 2. Golden Era Heritage: Venice Beach bodybuilding heritage with amber/gold metallic accents.
// 3. Stealth Monochrome: High-contrast Swiss editorial typography on OLED black.
// 4. Classic: High-contrast digital card format.

import { fmtNum } from './format.js'

export const SHARE_THEMES = [
  { id: 'obsidian', name: '⚡ Obsidian Neon', subtitle: 'Modern high-contrast athletic' },
  { id: 'gold', name: '🏆 Golden Era', subtitle: 'Classic iron luxury foil' },
  { id: 'stealth', name: '🖤 Stealth Minimal', subtitle: 'Swiss editorial monochrome' },
  { id: 'classic', name: '📱 Classic SmiTriX', subtitle: 'Balanced app layout' },
]

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
    exercises = [],
    streak = 0,
    theme = 'classic', // classic by default for backward-compatibility with tests & existing snapshots
    athleteName = '',
  } = options || {}

  const W = 1080
  const H = 1350
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Helper for safe roundRect (cross-browser / headless canvas fallback)
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

  if (theme === 'gold') {
    renderGoldTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, muscles, exercises, streak, athleteName, drawRoundRect })
  } else if (theme === 'stealth') {
    renderStealthTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, muscles, exercises, streak, athleteName, drawRoundRect })
  } else if (theme === 'obsidian') {
    renderObsidianTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, muscles, exercises, streak, athleteName, drawRoundRect })
  } else {
    renderClassicTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, muscles, exercises, streak, drawRoundRect })
  }

  return canvas
}

/* =========================================================================
   THEME 1: OBSIDIAN NEON (Athletic, Carbon-Weave Depth, High Contrast)
   ========================================================================= */
function renderObsidianTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, muscles, exercises, streak, athleteName, drawRoundRect }) {
  // Deep obsidian carbon background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#040608')
  bg.addColorStop(0.3, '#080d14')
  bg.addColorStop(0.7, '#060a0f')
  bg.addColorStop(1, '#020304')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Geometric grid accents
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)'
  ctx.lineWidth = 1
  for (let x = 60; x < W; x += 120) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }

  // Radial electric emerald & cyan spotlights
  const glowL = ctx.createRadialGradient(200, 250, 10, 200, 250, 480)
  glowL.addColorStop(0, 'rgba(48, 209, 88, 0.18)')
  glowL.addColorStop(0.5, 'rgba(48, 209, 88, 0.04)')
  glowL.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glowL
  ctx.fillRect(0, 0, W, H)

  const glowR = ctx.createRadialGradient(880, 850, 10, 880, 850, 520)
  glowR.addColorStop(0, 'rgba(10, 132, 255, 0.16)')
  glowR.addColorStop(0.5, 'rgba(10, 132, 255, 0.03)')
  glowR.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glowR
  ctx.fillRect(0, 0, W, H)

  // Outer border frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 2
  ctx.beginPath()
  drawRoundRect(40, 40, W - 80, H - 80, 24)
  ctx.stroke()

  // Top neon accent hairline
  const barGrad = ctx.createLinearGradient(40, 0, W - 40, 0)
  barGrad.addColorStop(0, '#30d158')
  barGrad.addColorStop(0.5, '#40c8e0')
  barGrad.addColorStop(1, '#0a84ff')
  ctx.fillStyle = barGrad
  ctx.fillRect(40, 40, W - 80, 6)

  // Brand Pill
  const pillW = 210, pillH = 46, pillX = 80, pillY = 74
  ctx.fillStyle = 'rgba(48, 209, 88, 0.12)'
  ctx.beginPath()
  drawRoundRect(pillX, pillY, pillW, pillH, 23)
  ctx.fill()
  ctx.strokeStyle = '#30d158'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#30d158'
  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('⚡ SMITRIX PRO', pillX + pillW / 2, pillY + 30)

  // Streak badge or Athlete tag
  if (streak > 0) {
    const sText = `🔥 ${streak} WEEKS STREAK`
    const sW = 230, sH = 46, sX = W - sW - 80, sY = 74
    ctx.fillStyle = 'rgba(255, 159, 10, 0.14)'
    ctx.beginPath()
    drawRoundRect(sX, sY, sW, sH, 23)
    ctx.fill()
    ctx.strokeStyle = '#ff9f0a'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ff9f0a'
    ctx.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(sText, sX + sW / 2, sY + 30)
  } else if (athleteName) {
    const aText = `ATHLETE: ${athleteName.toUpperCase()}`
    const aW = 240, aH = 46, aX = W - aW - 80, aY = 74
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.beginPath()
    drawRoundRect(aX, aY, aW, aH, 23)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 17px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(aText, aX + aW / 2, aY + 30)
  }

  // Session Name & Date
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 60px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  ctx.textAlign = 'left'
  const displayTitle = (name || 'Workout Session').toUpperCase()
  ctx.fillText(displayTitle, 80, 195)

  ctx.fillStyle = 'rgba(235, 235, 245, 0.6)'
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText(date ? `COMPLETED · ${date.toUpperCase()}` : 'SESSION COMPLETED', 80, 240)

  // 4 Metrics Grid (2x2)
  const cardW = 435, cardH = 170, gap = 30
  const startX = 80, startY = 285
  const metrics = [
    { label: 'ACTIVE DURATION', val: duration || '—', color: '#30d158', unit: 'TIME' },
    { label: 'VOLUME MOVED', val: `${fmtNum(volume)}`, color: '#40c8e0', unit },
    { label: 'TOTAL SETS', val: `${sets}`, sub: `${workSets} working sets`, color: '#ffd60a' },
    { label: 'SESSION STATUS', val: prs.length > 0 ? `${prs.length} NEW PRs` : 'INTENSE', color: prs.length > 0 ? '#ff375f' : '#30d158' }
  ]

  metrics.forEach((m, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = startX + col * (cardW + gap)
    const y = startY + row * (cardH + gap)

    ctx.fillStyle = 'rgba(16, 24, 34, 0.85)'
    ctx.beginPath()
    drawRoundRect(x, y, cardW, cardH, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Corner indicator
    ctx.fillStyle = m.color
    ctx.fillRect(x + 24, y + 24, 8, 8)

    ctx.fillStyle = 'rgba(235, 235, 245, 0.55)'
    ctx.font = '800 16px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(m.label, x + 42, y + 33)

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 46px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(m.val, x + 24, y + 105)

    if (m.unit) {
      ctx.fillStyle = m.color
      ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(` ${m.unit}`, x + 24 + ctx.measureText(m.val).width, y + 105)
    } else if (m.sub) {
      ctx.fillStyle = 'rgba(235, 235, 245, 0.5)'
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(m.sub, x + 24, y + 145)
    }
  })

  // Lower Section: PR Wall / Exercises
  let curY = 690
  const boxW = W - 160
  const boxX = 80

  if (prs && prs.length > 0) {
    const prBoxH = Math.min(260, 90 + prs.slice(0, 4).length * 42)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.06)'
    ctx.beginPath()
    drawRoundRect(boxX, curY, boxW, prBoxH, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ffd700'
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🏆  PERSONAL RECORDS BROKEN', boxX + 28, curY + 48)

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 22px -apple-system, BlinkMacSystemFont, sans-serif'
    prs.slice(0, 4).forEach((pr, idx) => {
      const text = typeof pr === 'string' ? pr : pr.name || pr.id
      ctx.fillText(`•  ${text}`, boxX + 32, curY + 92 + idx * 40)
    })
    curY += prBoxH + 24
  }

  // Exercises Breakdown
  if (exercises && exercises.length > 0 && curY < 1120) {
    const maxRows = Math.min(exercises.length, Math.floor((1140 - curY - 50) / 44))
    if (maxRows > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
      const exH = 65 + maxRows * 44
      ctx.beginPath()
      drawRoundRect(boxX, curY, boxW, exH, 20)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = 'rgba(235, 235, 245, 0.55)'
      ctx.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('EXERCISE BREAKDOWN', boxX + 28, curY + 40)

      exercises.slice(0, maxRows).forEach((ex, idx) => {
        const yRow = curY + 80 + idx * 44
        ctx.fillStyle = '#ffffff'
        ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.textAlign = 'left'
        let exTitle = ex.name || 'Exercise'
        if (ctx.measureText(exTitle).width > 550) {
          while (exTitle.length > 3 && ctx.measureText(exTitle + '…').width > 550) {
            exTitle = exTitle.slice(0, -1)
          }
          exTitle += '…'
        }
        ctx.fillText(exTitle, boxX + 28, yRow)

        ctx.fillStyle = '#30d158'
        ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(ex.sets || '3 sets', boxX + boxW - 28, yRow)
      })
    }
  }

  // Footer / Verification Bar
  ctx.fillStyle = 'rgba(235, 235, 245, 0.4)'
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('VERIFIED GYM TELEMETRY · POWERED BY SMITRIX LOCAL-FIRST', W / 2, 1260)
}

/* =========================================================================
   THEME 2: GOLDEN ERA (Vintage Bodybuilding, Venice Beach Amber Luxury)
   ========================================================================= */
function renderGoldTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, exercises, streak, drawRoundRect }) {
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#100c08')
  bg.addColorStop(0.4, '#1c140a')
  bg.addColorStop(0.8, '#140f08')
  bg.addColorStop(1, '#0b0805')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Warm Amber Glow
  const glow = ctx.createRadialGradient(W / 2, 280, 20, W / 2, 280, 500)
  glow.addColorStop(0, 'rgba(255, 190, 40, 0.16)')
  glow.addColorStop(0.6, 'rgba(255, 190, 40, 0.03)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Double Gold Hairline Border
  ctx.strokeStyle = 'rgba(255, 200, 60, 0.35)'
  ctx.lineWidth = 3
  ctx.beginPath()
  drawRoundRect(45, 45, W - 90, H - 90, 20)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 200, 60, 0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  drawRoundRect(55, 55, W - 110, H - 110, 16)
  ctx.stroke()

  // Heritage Header Banner
  ctx.fillStyle = 'rgba(255, 215, 0, 0.12)'
  ctx.beginPath()
  drawRoundRect(W / 2 - 160, 75, 320, 46, 23)
  ctx.fill()
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#ffd700'
  ctx.font = '900 20px -apple-system, BlinkMacSystemFont, serif'
  ctx.textAlign = 'center'
  ctx.fillText('🏛️ GOLDEN ERA IRON HERITAGE', W / 2, 105)

  // Main Title
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 62px -apple-system, BlinkMacSystemFont, serif'
  ctx.textAlign = 'center'
  ctx.fillText((name || 'GOLDEN SPLIT').toUpperCase(), W / 2, 205)

  ctx.fillStyle = 'rgba(255, 215, 120, 0.75)'
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText(date ? `VENICE BEACH CHRONICLE · ${date.toUpperCase()}` : 'CERTIFIED IRON EFFORT', W / 2, 245)

  // Golden Metric Pillars (3 Columns)
  const pillW = 280, pillH = 175, gap = 20
  const startX = (W - (pillW * 3 + gap * 2)) / 2
  const startY = 295
  const goldMetrics = [
    { label: 'WORK DURATION', val: duration || '—', sub: 'Pure Density' },
    { label: 'STEEL MOVED', val: `${fmtNum(volume)}`, sub: unit.toUpperCase() },
    { label: 'SETS CRUSHED', val: `${sets}`, sub: `${workSets} to failure` }
  ]

  goldMetrics.forEach((m, idx) => {
    const x = startX + idx * (pillW + gap)
    ctx.fillStyle = 'rgba(35, 26, 15, 0.8)'
    ctx.beginPath()
    drawRoundRect(x, startY, pillW, pillH, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 215, 120, 0.6)'
    ctx.font = '800 15px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(m.label, x + pillW / 2, startY + 38)

    ctx.fillStyle = '#ffd700'
    ctx.font = '900 44px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(m.val, x + pillW / 2, startY + 105)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(m.sub, x + pillW / 2, startY + 145)
  })

  // Quotation Banner
  ctx.fillStyle = 'rgba(255, 215, 0, 0.05)'
  ctx.beginPath()
  drawRoundRect(90, 505, W - 180, 110, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)'
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'italic 600 24px -apple-system, BlinkMacSystemFont, serif'
  ctx.textAlign = 'center'
  ctx.fillText('“The last three or four reps is what makes the muscle grow.”', W / 2, 555)
  ctx.fillStyle = '#ffd700'
  ctx.font = '700 18px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('— ARNOLD SCHWARZENEGGER', W / 2, 590)

  // Exercises & PRs
  let nextY = 650
  if (prs && prs.length > 0) {
    const prH = Math.min(240, 85 + prs.slice(0, 3).length * 44)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.08)'
    ctx.beginPath()
    drawRoundRect(90, nextY, W - 180, prH, 18)
    ctx.fill()
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ffd700'
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, serif'
    ctx.textAlign = 'left'
    ctx.fillText('🏆  NEW GOLDEN BENCHMARKS (PRS)', 125, nextY + 48)

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 22px -apple-system, BlinkMacSystemFont, sans-serif'
    prs.slice(0, 3).forEach((pr, i) => {
      const text = typeof pr === 'string' ? pr : pr.name || pr.id
      ctx.fillText(`★  ${text}`, 130, nextY + 95 + i * 44)
    })
    nextY += prH + 25
  }

  // Footer stamp
  ctx.fillStyle = 'rgba(255, 215, 120, 0.45)'
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('FORGED IN IRON · SMITRIX ATHLETIC PROTOCOL', W / 2, 1260)
}

/* =========================================================================
   THEME 3: STEALTH MINIMAL (OLED Swiss Editorial Typography)
   ========================================================================= */
function renderStealthTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, exercises, streak, drawRoundRect }) {
  // Pure Pitch Black
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  // Minimal Clean Border
  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 2
  ctx.beginPath()
  drawRoundRect(50, 50, W - 100, H - 100, 16)
  ctx.stroke()

  // Header
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 22px -apple-system, BlinkMacSystemFont, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('SMITRIX // TELEMETRY', 90, 110)

  if (streak > 0) {
    ctx.textAlign = 'right'
    ctx.fillText(`STREAK: ${streak}W`, W - 90, 110)
  }

  // Divider Line
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(90, 140)
  ctx.lineTo(W - 90, 140)
  ctx.stroke()

  // Giant Title
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 70px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText((name || 'WORKOUT').toUpperCase(), 90, 235)

  ctx.fillStyle = '#777777'
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, monospace'
  ctx.fillText(date ? `DATE: ${date.toUpperCase()}` : 'RECORDED SESSION', 90, 275)

  // Massive Data Readouts
  const stats = [
    { label: 'VOLUME', val: `${fmtNum(volume)}`, unit },
    { label: 'DURATION', val: duration || '—', unit: '' },
    { label: 'TOTAL SETS', val: `${sets}`, unit: 'SETS' },
  ]

  stats.forEach((st, i) => {
    const y = 350 + i * 160
    ctx.fillStyle = '#444444'
    ctx.font = '800 18px -apple-system, BlinkMacSystemFont, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`0${i + 1} // ${st.label}`, 90, y)

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 72px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(st.val, 90, y + 75)

    if (st.unit) {
      ctx.fillStyle = '#888888'
      ctx.font = '700 26px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(` ${st.unit}`, 90 + ctx.measureText(st.val).width, y + 75)
    }

    ctx.strokeStyle = '#222222'
    ctx.beginPath()
    ctx.moveTo(90, y + 110)
    ctx.lineTo(W - 90, y + 110)
    ctx.stroke()
  })

  // PR Highlights if any
  if (prs && prs.length > 0) {
    ctx.fillStyle = '#30d158'
    ctx.font = '800 22px -apple-system, BlinkMacSystemFont, monospace'
    ctx.fillText(`+ ${prs.length} NEW RECORD(S) RECORDED`, 90, 890)
    prs.slice(0, 3).forEach((pr, idx) => {
      const text = typeof pr === 'string' ? pr : pr.name || pr.id
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 24px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(`• ${text}`, 90, 935 + idx * 40)
    })
  }

  // Footer
  ctx.fillStyle = '#555555'
  ctx.font = '700 18px -apple-system, BlinkMacSystemFont, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('SMITRIX // ZERO CLOUD TRACKING // 100% PRIVATE', 90, 1260)
}

/* =========================================================================
   THEME 4: CLASSIC SMITRIX (Guarantees backward compatibility with tests)
   ========================================================================= */
function renderClassicTheme(ctx, { W, H, duration, volume, sets, workSets, prs, unit, name, date, muscles, exercises, streak, drawRoundRect }) {
  // 1. Background deep gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#06080e')
  bgGrad.addColorStop(0.35, '#0c1322')
  bgGrad.addColorStop(0.7, '#0f172a')
  bgGrad.addColorStop(1, '#05070c')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // 2. Ambient radial glow highlights
  const limeGlow = ctx.createRadialGradient(W * 0.25, H * 0.18, 20, W * 0.25, H * 0.18, 420)
  limeGlow.addColorStop(0, 'rgba(48, 209, 88, 0.16)')
  limeGlow.addColorStop(0.5, 'rgba(48, 209, 88, 0.05)')
  limeGlow.addColorStop(1, 'rgba(48, 209, 88, 0)')
  ctx.fillStyle = limeGlow
  ctx.fillRect(0, 0, W, H)

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

  // Streak badge
  if (streak > 0) {
    const sText = `🔥 ${streak} week streak`
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, sans-serif'
    const sTextW = ctx.measureText ? ctx.measureText(sText).width : 130
    const sW = Math.max(160, Math.round(sTextW + 36))
    const sH = 38
    const sX = W - sW - 85
    const sY = badgeY + 3
    ctx.fillStyle = 'rgba(255, 159, 10, 0.12)'
    ctx.beginPath()
    drawRoundRect(sX, sY, sW, sH, 19)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 159, 10, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#ff9f0a'
    ctx.textAlign = 'center'
    ctx.fillText(sText, sX + sW / 2, sY + 25)
  }

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

    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)'
    ctx.beginPath()
    drawRoundRect(x, y, cardW, cardH, 22)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    const cardGlow = ctx.createLinearGradient(x, y, x, y + cardH)
    cardGlow.addColorStop(0, 'rgba(255, 255, 255, 0.04)')
    cardGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = cardGlow
    ctx.beginPath()
    drawRoundRect(x, y, cardW, cardH, 22)
    ctx.fill()

    ctx.fillStyle = 'rgba(235, 235, 245, 0.6)'
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${st.icon}  ${st.label}`, x + 28, y + 52)

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 36px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(st.val, x + 28, y + 118)
  })

  // 8. PR Showcase, Target Muscles, or Exercises Section
  let nextY = 705

  if (exercises && exercises.length > 0) {
    const exCardW = 910, exCardX = (W - exCardW) / 2
    let exCardY = nextY
    const maxEx = prs && prs.length > 0 ? 3 : 5

    ctx.fillStyle = 'rgba(235, 235, 245, 0.5)'
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('EXERCISES', exCardX + 4, exCardY + 20)
    exCardY += 40

    exercises.slice(0, maxEx).forEach((ex, i) => {
      const setsText = typeof ex.sets === 'string' ? ex.sets : `${ex.sets} sets`
      const rowY = exCardY + i * 44

      ctx.fillStyle = '#ffffff'
      ctx.font = '500 24px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'

      let exName = ex.name || 'Exercise'
      const maxNameWidth = 540
      if (ctx.measureText && ctx.measureText(exName).width > maxNameWidth) {
        while (exName.length > 3 && ctx.measureText(exName + '…').width > maxNameWidth) {
          exName = exName.slice(0, -1)
        }
        exName += '…'
      }
      ctx.fillText(exName, exCardX + 12, rowY)

      ctx.fillStyle = 'rgba(235, 235, 245, 0.5)'
      ctx.font = '500 22px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(setsText, exCardX + 580, rowY)
    })
    if (exercises.length > maxEx) {
      ctx.fillStyle = 'rgba(235, 235, 245, 0.35)'
      ctx.font = '400 20px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`+${exercises.length - maxEx} more exercises`, exCardX + 12, exCardY + maxEx * 44)
    }
    nextY = exCardY + Math.min(exercises.length, maxEx) * 44 + (exercises.length > maxEx ? 36 : 0) + 24
  }

  if (prs && prs.length > 0) {
    const prCardW = 910
    const maxPr = exercises && exercises.length > 0 ? 3 : 5
    const displayPrs = prs.slice(0, maxPr)
    const hasExercises = Boolean(exercises && exercises.length > 0)
    const prCardH = hasExercises
      ? 96 + displayPrs.length * 44 + (prs.length > maxPr ? 32 : 0)
      : Math.min(320, 96 + prs.length * 48)
    const prCardX = (W - prCardW) / 2
    const prCardY = nextY

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
    displayPrs.forEach((item, i) => {
      const text = typeof item === 'string' ? item : item.name || item.id
      ctx.fillText(`•  ${text}`, prCardX + 38, prCardY + 100 + i * 44)
    })
    if (prs.length > maxPr) {
      ctx.fillStyle = 'rgba(255, 214, 10, 0.7)'
      ctx.font = '500 20px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(`+${prs.length - maxPr} more PRs`, prCardX + 38, prCardY + 100 + maxPr * 44)
    }

    nextY = prCardY + prCardH + 30
  } else if (muscles && muscles.length > 0 && (!exercises || exercises.length === 0)) {
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
  } else if (!exercises || exercises.length === 0) {
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
  const quoteY = Math.max(1180, Math.min(1215, nextY + 25))
  ctx.fillStyle = 'rgba(235, 235, 245, 0.45)'
  ctx.font = 'italic 500 26px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('“Consistency is what transforms average into excellence.”', W / 2, quoteY)

  // 10. App footer
  ctx.fillStyle = 'rgba(235, 235, 245, 0.35)'
  ctx.font = '700 22px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('TRACKED WITH SMITRIX · NO ADS, NO SUBSCRIPTIONS', W / 2, Math.max(1260, quoteY + 65))
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
