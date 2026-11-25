import { useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { workoutVolume } from '../lib/history.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { dayStreakWithOff } from '../lib/gymmane-awards.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

const SWATCHES = ['#FFFFFF', '#111111', '#D9A184', '#B98F72', '#8FA377', '#E8E1D7']

export function openStickerEditor(workout) {
  useUI.getState().openSheet(close => <StickerEditorBody workout={workout} close={close} />)
}

function StickerEditorBody({ workout, close }) {
  const S = useStore(s => s.S)
  const fileRef = useRef(null)
  const [photo, setPhoto] = useState('')
  const [layout, setLayout] = useState(0) // 0: Minimal stack, 1: Glass badge, 2: Editorial strip
  const [swatch, setSwatch] = useState(0)
  const [showStreak, setShowStreak] = useState(true)
  const [showDate, setShowDate] = useState(true)
  const [pos, setPos] = useState({ x: 50, y: 70 })
  const [scale, setScale] = useState(1)
  const dragRef = useRef(null)

  const vol = Math.round(workoutVolume(workout))
  const sets = (workout?.entries || []).reduce((s, e) => s + (e.sets || []).filter(x => x.done).length, 0)
  const durMin = workout?.start && workout?.end ? Math.max(1, Math.round((workout.end - workout.start) / 60000)) : 45
  const streak = dayStreakWithOff(S).current
  const color = SWATCHES[swatch]

  const onFile = e => {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => setPhoto(String(rd.result || ''))
    rd.readAsDataURL(f)
  }

  const exportPng = () => {
    const W = 1080
    const H = 1920
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')

    const drawOverlay = () => {
      ctx.save()
      ctx.translate((pos.x / 100) * W, (pos.y / 100) * H)
      ctx.scale(scale, scale)

      if (layout === 1) {
        ctx.fillStyle = color === '#111111' ? 'rgba(255,255,255,0.85)' : 'rgba(15,15,15,0.72)'
        ctx.beginPath()
        ctx.roundRect(-380, -210, 760, 420, 48)
        ctx.fill()
      }

      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.font = '800 32px Nunito, sans-serif'
      ctx.fillText('SMITRIX WORKOUT', 0, -120)

      ctx.font = '900 68px Nunito, sans-serif'
      ctx.fillText(workout?.name || 'Workout', 0, -40)

      ctx.font = '900 54px Nunito, sans-serif'
      ctx.fillText(`${fmtNum(vol)} ${S.unit}  ·  ${sets} SETS  ·  ${durMin}m`, 0, 52)

      const subParts = []
      if (showDate && workout?.d) subParts.push(fmtDate(workout.d, true))
      if (showStreak && streak > 0) subParts.push(`🔥 ${streak}-day streak`)
      if (subParts.length) {
        ctx.font = '700 34px Nunito, sans-serif'
        ctx.globalAlpha = 0.85
        ctx.fillText(subParts.join('  ·  '), 0, 126)
      }
      ctx.restore()

      const link = document.createElement('a')
      link.download = `smitrix-sticker-${workout?.d || 'today'}.png`
      link.href = c.toDataURL('image/png')
      link.click()
      useUI.getState().toast(t('Sticker PNG saved!'), { icon: 'sticker', accent: 'var(--gm-sage)' })
    }

    if (photo) {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.max(W / img.width, H / img.height)
        const dw = img.width * ratio
        const dh = img.height * ratio
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
        drawOverlay()
      }
      img.src = photo
    } else {
      // Transparent PNG sticker!
      drawOverlay()
    }
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>{t('Workout Sticker')}</h2>
          <div className="dim small">{t('Drag sticker to reposition · export transparent PNG or over a photo')}</div>
        </div>
        <button type="button" className="iconbtn" onClick={close}><Icon name="xmark" /></button>
      </div>

      {/* 9:16 Interactive Sticker Stage */}
      <div
        onPointerDown={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          dragRef.current = { rect }
          e.currentTarget.setPointerCapture?.(e.pointerId)
        }}
        onPointerMove={e => {
          if (!dragRef.current) return
          const { rect } = dragRef.current
          setPos({
            x: Math.max(12, Math.min(88, ((e.clientX - rect.left) / rect.width) * 100)),
            y: Math.max(12, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100)),
          })
        }}
        onPointerUp={() => { dragRef.current = null }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 260,
          aspectRatio: '9 / 16',
          margin: '0 auto 14px',
          borderRadius: 22,
          overflow: 'hidden',
          background: photo
            ? `url(${photo}) center/cover no-repeat`
            : 'repeating-conic-gradient(var(--surface-2) 0% 25%, var(--surface) 0% 50%) 50% / 20px 20px',
          border: '1px solid var(--sep)',
          touchAction: 'none',
          cursor: 'move',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            color,
            textAlign: 'center',
            padding: layout === 1 ? '14px 18px' : '6px 10px',
            borderRadius: 18,
            background: layout === 1 ? (color === '#111111' ? 'rgba(255,255,255,0.84)' : 'rgba(12,12,12,0.72)') : 'transparent',
            backdropFilter: layout === 1 ? 'blur(12px)' : 'none',
            border: layout === 2 ? `2px solid ${color}` : 'none',
            minWidth: 180,
            userSelect: 'none',
            textShadow: layout === 0 && photo ? '0 2px 12px rgba(0,0,0,0.65)' : 'none',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', opacity: 0.78 }}>SMITRIX</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{workout?.name || t('Workout')}</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>
            {fmtNum(vol)} {S.unit} · {sets} {t('sets')} · {durMin}m
          </div>
          {(showDate || showStreak) && (
            <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.8, marginTop: 5 }}>
              {[showDate && workout?.d ? fmtDate(workout.d, true) : null, showStreak && streak > 0 ? `${streak}d streak` : null].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="row between" style={{ marginBottom: 12, gap: 8 }}>
        <div className="row" style={{ gap: 6 }}>
          {SWATCHES.map((c, idx) => (
            <button
              key={c}
              type="button"
              onClick={() => setSwatch(idx)}
              style={{
                width: 26, height: 26, borderRadius: '50%', background: c,
                border: swatch === idx ? '2.5px solid var(--acc)' : '1.5px solid var(--sep)',
              }}
            />
          ))}
        </div>
        <button type="button" className="gm-see-all" onClick={() => setLayout(l => (l + 1) % 3)}>
          {t('Style {0}', layout + 1)}
        </button>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button type="button" className={'chip' + (showDate ? ' on' : '')} onClick={() => setShowDate(v => !v)}>{t('Date')}</button>
        <button type="button" className={'chip' + (showStreak ? ' on' : '')} onClick={() => setShowStreak(v => !v)}>{t('Streak')}</button>
        <input type="range" min="0.6" max="1.4" step="0.05" value={scale} onChange={e => setScale(Number(e.target.value))} style={{ flex: 1 }} />
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
          <Icon name="image" /> {photo ? t('Change photo') : t('Add photo')}
        </button>
        <button type="button" className="btn primary" style={{ flex: 1 }} onClick={exportPng}>
          <Icon name="download" /> {t('Save PNG')}
        </button>
      </div>
    </div>
  )
}
