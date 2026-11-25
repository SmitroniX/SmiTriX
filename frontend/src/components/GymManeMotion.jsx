import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'
import Confetti from './Confetti.jsx'
import { t } from '../lib/i18n.js'
import { exOr } from '../lib/exercises.js'
import { musclesOf } from '../lib/muscles.js'

/* ============================================================================
   GymMane Motion & Core UI Primitives
   ========================================================================== */

export const FOLDER_HUES = [
  '#F3C7B1', // warm peach
  '#A78BDA', // lavender
  '#A8C99E', // sage
  '#9CC2E8', // sky
  '#E8CF98', // gold
  '#E6A4B9', // rose
]

export function folderHueFor(routine) {
  if (!routine) return FOLDER_HUES[0]
  if (typeof routine.color === 'number' && routine.color >= 0) {
    return FOLDER_HUES[routine.color % FOLDER_HUES.length]
  }
  const str = String(routine.id || routine.name || 'a')
  let sum = 0
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i)
  return FOLDER_HUES[sum % FOLDER_HUES.length]
}

/* ---------- AppBackground (dots / grid / photo / none) ---------- */
export function AppBackground() {
  const pattern = useStore(s => s.S?.bgPattern ?? 'dots')
  const photo = useStore(s => s.S?.bgPhoto || '')
  const dim = useStore(s => s.S?.bgDim ?? 0.55)
  if (pattern === 'none') return null
  if (pattern === 'photo' && photo) {
    return (
      <div className="gm-bg photo" aria-hidden="true">
        <img src={photo} alt="" />
        <div
          className="gm-bg-veil"
          style={{
            background: `linear-gradient(180deg, rgba(10,10,10,${dim}) 0%, rgba(10,10,10,${Math.min(1, dim + 0.2)}) 100%)`,
          }}
        />
      </div>
    )
  }
  return <div className={`gm-bg ${pattern === 'grid' ? 'grid' : 'dots'}`} aria-hidden="true" />
}

/* ---------- Staggered Rise entrance (40ms + idx * 70ms) ---------- */
export function Rise({ index = 0, children, className = '', style }) {
  const delay = 30 + Math.min(index, 7) * 60
  return (
    <div className={`gm-rise ${className}`} style={{ '--rise-delay': `${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

/* ---------- Odometer RollingText ---------- */
export function RollingText({ value, countsDown = false, className = '', style }) {
  const text = String(value ?? '')
  const prevRef = useRef(text)
  const dirRef = useRef(countsDown ? 'down' : 'up')

  if (prevRef.current !== text) {
    if (countsDown !== undefined && countsDown !== null) {
      dirRef.current = countsDown ? 'down' : 'up'
    } else {
      const a = parseFloat(prevRef.current.replace(/[^0-9.-]/g, ''))
      const b = parseFloat(text.replace(/[^0-9.-]/g, ''))
      if (Number.isFinite(a) && Number.isFinite(b) && a !== b) {
        dirRef.current = b > a ? 'up' : 'down'
      }
    }
    prevRef.current = text
  }

  const chars = Array.from(text)
  const dir = dirRef.current
  return (
    <span className={`gm-roll ${className}`} style={style} aria-label={text}>
      {chars.map((ch, idx) => (
        <span key={`${chars.length - idx}`} className="gm-roll-cell" aria-hidden="true">
          <span key={`${ch}-${idx}`} className={`gm-roll-char ${/\d/.test(ch) ? dir : ''}`}>
            {ch}
          </span>
        </span>
      ))}
    </span>
  )
}

/* ---------- Count-up RollIn on mount ---------- */
export function RollIn({ value, format, duration = 850, className = '', style }) {
  const target = Number(value)
  const [shown, setShown] = useState(Number.isFinite(target) ? target : 0)

  useEffect(() => {
    if (!Number.isFinite(target) || target === 0) { setShown(target || 0); return }
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = now => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(target * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else setShown(target)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  const label = format ? format(shown) : String(Math.round(shown))
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{label}</span>
}

/* ---------- RestGlow screen-edge pulse when rest finishes ---------- */
export function RestGlow() {
  const tick = useUI(s => s.restGlowTick)
  const [activeKey, setActiveKey] = useState(0)

  useEffect(() => {
    if (!tick) return
    setActiveKey(tick)
    const tm = setTimeout(() => setActiveKey(0), 1750)
    return () => clearTimeout(tm)
  }, [tick])

  if (!activeKey) return null
  return <div key={activeKey} className="gm-rest-glow" aria-hidden="true" />
}

/* ---------- StartCountdown 3-2-1 fullscreen overlay ---------- */
export function StartCountdown() {
  const cd = useUI(s => s.countdown)
  const closeCountdown = useUI(s => s.closeCountdown)
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (!cd) return
    setLeft(cd.sec)
    let cur = cd.sec
    const iv = setInterval(() => {
      cur -= 1
      if (cur <= 0) {
        clearInterval(iv)
        closeCountdown(true)
      } else {
        setLeft(cur)
        try { navigator.vibrate?.(35) } catch {}
      }
    }, 950)
    return () => clearInterval(iv)
  }, [cd?.id])

  if (!cd || left <= 0) return null
  return (
    <div className="gm-countdown" onClick={() => closeCountdown(true)} role="dialog" aria-label={t('Get ready')}>
      <div className="gm-micro" style={{ letterSpacing: '0.25em', marginBottom: 18 }}>
        {t('GET READY')}
      </div>
      <div key={left} className="gm-countdown-num">{left}</div>
      {cd.exerciseName && (
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 18, padding: '0 28px', textAlign: 'center' }}>
          {cd.exerciseName}
        </div>
      )}
      <div className="dim small" style={{ position: 'absolute', bottom: 38, fontWeight: 700 }}>
        {t('Tap anywhere to skip')}
      </div>
    </div>
  )
}

/* ---------- CollapsedHeader blur bar on scroll ---------- */
export function CollapsedHeader({ title }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const onScroll = () => setShown((window.scrollY || 0) > 44)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!title) return null
  return (
    <div className={'gm-collapsed-bar' + (shown ? ' shown' : '')} aria-hidden={!shown}>
      <span>{title}</span>
    </div>
  )
}

/* ---------- MiniBody compact front/back silhouette for cards ---------- */
export function MiniBody({ muscles = [], height = 30 }) {
  const set = new Set(muscles)
  const hasUpper = ['chest', 'delts', 'biceps', 'triceps', 'lats', 'upper-back', 'traps', 'forearms'].some(m => set.has(m))
  const hasCore = ['abs', 'obliques', 'lower-back'].some(m => set.has(m))
  const hasLegs = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'].some(m => set.has(m))
  const lit = 'var(--acc)'
  const dim = 'color-mix(in srgb, var(--label-3) 55%, transparent)'
  return (
    <svg viewBox="0 0 56 44" style={{ height, width: 'auto', flex: 'none' }} aria-hidden="true">
      {/* Front mini figure */}
      <circle cx="14" cy="6" r="3.4" fill={dim} />
      <rect x="9.5" y="10.5" width="9" height="8" rx="3" fill={hasUpper ? lit : dim} />
      <rect x="5.5" y="11" width="3" height="10" rx="1.5" fill={set.has('biceps') || set.has('delts') ? lit : dim} />
      <rect x="19.5" y="11" width="3" height="10" rx="1.5" fill={set.has('biceps') || set.has('delts') ? lit : dim} />
      <rect x="10.5" y="19" width="7" height="6" rx="2" fill={hasCore ? lit : dim} />
      <rect x="9.8" y="25.5" width="3.6" height="15" rx="1.8" fill={hasLegs ? lit : dim} />
      <rect x="14.6" y="25.5" width="3.6" height="15" rx="1.8" fill={hasLegs ? lit : dim} />
      {/* Back mini figure */}
      <circle cx="42" cy="6" r="3.4" fill={dim} />
      <rect x="37.5" y="10.5" width="9" height="8" rx="3" fill={set.has('lats') || set.has('upper-back') || set.has('traps') || hasUpper ? lit : dim} />
      <rect x="33.5" y="11" width="3" height="10" rx="1.5" fill={set.has('triceps') ? lit : dim} />
      <rect x="47.5" y="11" width="3" height="10" rx="1.5" fill={set.has('triceps') ? lit : dim} />
      <rect x="38.5" y="19" width="7" height="6" rx="2" fill={set.has('glutes') || set.has('lower-back') ? lit : dim} />
      <rect x="37.8" y="25.5" width="3.6" height="15" rx="1.8" fill={set.has('hamstrings') || set.has('calves') || hasLegs ? lit : dim} />
      <rect x="42.6" y="25.5" width="3.6" height="15" rx="1.8" fill={set.has('hamstrings') || set.has('calves') || hasLegs ? lit : dim} />
    </svg>
  )
}

/* ---------- RoutineFolder 3D stacked colored folder ---------- */
export function RoutineFolder({ routine, onOpen, onStart, onMenu, lastDoneLabel }) {
  const hue = folderHueFor(routine)
  const exList = routine?.ex || []
  const count = exList.length
  const slugs = useMemo(() => {
    const out = new Set()
    for (const item of exList) {
      const ex = exOr(item?.id || item)
      if (!ex) continue
      for (const k of Object.keys(musclesOf(ex))) out.add(k)
    }
    return Array.from(out)
  }, [exList])

  return (
    <div className="gm-rfolder" onClick={onOpen} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen?.()}>
      <div className="gm-rfolder-tab" />
      <div className="gm-rfolder-shell" />
      <div className="gm-rfolder-back" style={{ background: `color-mix(in srgb, ${hue} 58%, #000)` }} />
      <div className="gm-rfolder-paper" style={{ background: hue }}>
        <div className="gm-rfolder-line" style={{ width: '92%', background: 'rgba(0,0,0,0.28)' }} />
        <div className="gm-rfolder-line" style={{ width: '56%', background: 'rgba(0,0,0,0.14)' }} />
      </div>
      <div
        className="gm-rfolder-front"
        style={{ background: `color-mix(in srgb, var(--surface-2) 86%, ${hue} 14%)` }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div className="gm-rfolder-title">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {routine.name}
            </span>
            <Icon name="chevronRight" style={{ fontSize: 13, color: 'var(--label-2)', flex: 'none' }} />
          </div>
          {onMenu && (
            <button
              type="button"
              className="gm-rfolder-menu"
              aria-label={t('Routine options')}
              onClick={e => { e.stopPropagation(); onMenu(e) }}
            >
              <Icon name="dotsVertical" style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--label-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[routine.group, `${count} ${count === 1 ? t('exercise') : t('exercises')}`, lastDoneLabel].filter(Boolean).join(' · ')}
          </div>
          {count > 0 && <MiniBody muscles={slugs} height={26} />}
        </div>
      </div>
      <button
        type="button"
        className="gm-rfolder-foot"
        onClick={e => {
          e.stopPropagation()
          if (count > 0) onStart?.()
          else onOpen?.()
        }}
      >
        <Icon name={count > 0 ? 'playFill' : 'plus'} style={{ fontSize: 11 }} />
        <span>{count > 0 ? t('Start workout') : t('Add exercises')}</span>
      </button>
    </div>
  )
}

/* ---------- HomeFolder 3D peeking folder cards ---------- */
export function HomeFolder({ title, detail, kind, badge, onClick }) {
  const renderPeek = () => {
    if (kind === 'routines') {
      return (
        <div className="gm-peek-fan">
          {[FOLDER_HUES[2], FOLDER_HUES[5], FOLDER_HUES[0]].map((c, idx) => (
            <div
              key={idx}
              className="gm-peek-card"
              style={{
                width: 48, height: 42, background: c,
                transform: `translateX(${idx === 0 ? -36 : idx === 1 ? -12 : -24}px) rotate(${idx === 0 ? -10 : idx === 1 ? 8 : -2}deg)`,
                bottom: idx === 2 ? 4 : 0,
                flexDirection: 'column', gap: 4, padding: '8px 8px 0', justifyContent: 'flex-start', alignItems: 'flex-start',
              }}
            >
              <span style={{ width: '90%', height: 2.5, borderRadius: 2, background: 'rgba(0,0,0,0.28)' }} />
              <span style={{ width: '62%', height: 2.5, borderRadius: 2, background: 'rgba(0,0,0,0.16)' }} />
            </div>
          ))}
        </div>
      )
    }
    if (kind === 'tools') {
      return (
        <div className="gm-peek-fan">
          {[
            { icon: 'flame', c: 'var(--acc)', dx: -38, rot: -11, dy: 0 },
            { icon: 'plate', c: 'var(--gm-brass)', dx: -6, rot: 9, dy: 2 },
            { icon: 'calculator', c: 'var(--label)', dx: -22, rot: -1, dy: 6 },
          ].map((it, idx) => (
            <div
              key={idx}
              className="gm-peek-card"
              style={{
                width: 40, height: 44, background: 'var(--surface-2)',
                border: '1px solid color-mix(in srgb, var(--sep) 55%, transparent)',
                transform: `translateX(${it.dx}px) rotate(${it.rot}deg)`,
                bottom: it.dy, color: it.c, fontSize: 18,
              }}
            >
              <Icon name={it.icon} />
            </div>
          ))}
        </div>
      )
    }
    if (kind === 'journal') {
      return (
        <div className="gm-peek-fan">
          {[
            { bg: '#2C2824', dx: -36, rot: -10, dy: 0 },
            { bg: '#342F2A', dx: -8, rot: 8, dy: 2 },
            { bg: '#F2ECE4', dx: -22, rot: -2, dy: 6, ink: '#1A1713' },
          ].map((it, idx) => (
            <div
              key={idx}
              className="gm-peek-card"
              style={{
                width: 44, height: 46, background: it.bg,
                transform: `translateX(${it.dx}px) rotate(${it.rot}deg)`,
                bottom: it.dy, flexDirection: 'column', gap: 4, padding: '9px 7px 0', alignItems: 'flex-start', justifyContent: 'flex-start',
              }}
            >
              <span style={{ width: '80%', height: 2.5, borderRadius: 2, background: it.ink ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.2)' }} />
              <span style={{ width: '60%', height: 2.5, borderRadius: 2, background: it.ink ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)' }} />
              <span style={{ width: '44%', height: 2.5, borderRadius: 2, background: it.ink ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>
      )
    }
    if (kind === 'nutrition') {
      return (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
          <img src="./smitrix-ui/img/peek-shake.webp" alt="" style={{ height: 56, transform: 'rotate(-8deg)', objectFit: 'contain' }} />
          <img src="./smitrix-ui/img/peek-pan.webp" alt="" style={{ height: 60, transform: 'translateY(-4px)', objectFit: 'contain' }} />
          <img src="./smitrix-ui/img/peek-water.webp" alt="" style={{ height: 54, transform: 'rotate(7deg)', objectFit: 'contain' }} />
        </div>
      )
    }
    if (kind === 'recovery') {
      return (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
          <img src="./smitrix-ui/img/recovery-cold.webp" alt="" style={{ height: 54, transform: 'rotate(-9deg)', objectFit: 'contain' }} />
          <img src="./smitrix-ui/img/recovery-sauna.webp" alt="" style={{ height: 58, transform: 'translateY(-4px)', objectFit: 'contain' }} />
          <img src="./smitrix-ui/img/recovery-lungs.webp" alt="" style={{ height: 52, transform: 'rotate(8deg)', objectFit: 'contain' }} />
        </div>
      )
    }
    return null
  }

  return (
    <div className="gm-hfolder" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      <div className="gm-hfolder-back" />
      <div className="gm-hfolder-peek">{renderPeek()}</div>
      <div className="gm-hfolder-front">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          {badge && <span className="gm-beta-tag">{badge}</span>}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {detail}
        </div>
      </div>
    </div>
  )
}

/* ---------- GymTimerPanel (tabbed vertical-tick timer from session_screen) ---------- */
export function GymTimerPanel({
  label = 'RESTING',
  remaining = 0,
  total = 90,
  elapsed = '00:00',
  setsLabel = '0/0',
  hint = 'TAP TO SKIP',
  color = 'var(--gm-sage)',
  onTap,
  onMinus,
  onPlus,
}) {
  const tickCount = 34
  const fracLeft = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
  const drained = Math.floor((1 - fracLeft) * tickCount)
  const mins = Math.floor(Math.max(0, remaining) / 60)
  const secs = Math.max(0, remaining) % 60
  const clockStr = `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <div className="gm-timer-wrap">
      <div className="gm-timer-top">
        {onMinus ? (
          <button type="button" className="gm-timer-nudge" onClick={e => { e.stopPropagation(); onMinus() }}>
            −15
          </button>
        ) : <div style={{ width: 56 }} />}
        <div className="gm-timer-tab">{label}</div>
        {onPlus ? (
          <button type="button" className="gm-timer-nudge" onClick={e => { e.stopPropagation(); onPlus() }}>
            +15
          </button>
        ) : <div style={{ width: 56 }} />}
      </div>
      <div className="gm-timer-card" onClick={onTap} style={{ cursor: onTap ? 'pointer' : 'default' }}>
        <div className="gm-timer-ticks" aria-hidden="true">
          {Array.from({ length: tickCount }, (_, i) => {
            const isDrained = i < drained
            return (
              <span
                key={i}
                className="gm-timer-tick"
                style={{
                  height: isDrained ? 13 : 22,
                  backgroundColor: isDrained ? 'var(--surface-2)' : color,
                }}
              />
            )
          })}
        </div>
        <div className="gm-timer-stats">
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{elapsed}</div>
            <div className="gm-micro" style={{ fontSize: 9.5, marginTop: 2 }}>{t('ELAPSED')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <RollingText value={clockStr} countsDown={true} style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }} />
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', color, marginTop: 3, textTransform: 'uppercase' }}>
              {hint}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{setsLabel}</div>
            <div className="gm-micro" style={{ fontSize: 9.5, marginTop: 2 }}>{t('SETS')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- RulerPicker (tactile horizontal tape ruler) ---------- */
export function RulerPicker({ value, min = 30, max = 200, step = 0.5, unit = 'kg', majorEvery = 5, onChange }) {
  const scrollerRef = useRef(null)
  const tickGap = 10
  const steps = Math.round((max - min) / step)
  const syncing = useRef(false)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const idx = Math.round((Math.max(min, Math.min(max, value)) - min) / step)
    const targetX = idx * tickGap
    if (Math.abs(el.scrollLeft - targetX) > 3) {
      syncing.current = true
      el.scrollLeft = targetX
      requestAnimationFrame(() => { syncing.current = false })
    }
  }, [value, min, max, step])

  const handleScroll = () => {
    if (syncing.current) return
    const el = scrollerRef.current
    if (!el) return
    const idx = Math.max(0, Math.min(steps, Math.round(el.scrollLeft / tickGap)))
    const next = Math.round((min + idx * step) * 100) / 100
    if (next !== value) onChange?.(next)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
        <RollingText value={Number(value).toFixed(step < 1 ? 1 : 0)} style={{ fontSize: 34, fontWeight: 900 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--label-2)' }}>{unit}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div className="gm-ruler-needle" />
        <div className="gm-ruler-wrap" ref={scrollerRef} onScroll={handleScroll}>
          <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '50%', paddingRight: '50%', height: 64 }}>
            {Array.from({ length: steps + 1 }, (_, i) => {
              const v = min + i * step
              const isMajor = i % majorEvery === 0
              return (
                <div key={i} style={{ width: tickGap, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span
                    style={{
                      width: isMajor ? 2 : 1.2,
                      height: isMajor ? 28 : 16,
                      marginTop: isMajor ? 8 : 14,
                      borderRadius: 2,
                      background: isMajor ? 'var(--label-2)' : 'color-mix(in srgb, var(--label-3) 55%, transparent)',
                    }}
                  />
                  {isMajor && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--label-3)', marginTop: 4 }}>
                      {Math.round(v)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- 3D Interactive Spinning Medal ---------- */
export function MedalSpin({ id, name, date, handle, size = 140, locked = false, spinIn = false }) {
  const [rotY, setRotY] = useState(spinIn ? -360 : 12)
  const [rotX, setRotX] = useState(6)
  const dragRef = useRef(null)

  useEffect(() => {
    if (!spinIn) return
    const tm = setTimeout(() => setRotY(12), 40)
    return () => clearTimeout(tm)
  }, [spinIn])

  const onPointerDown = e => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX }
  }
  const onPointerMove = e => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setRotY(dragRef.current.ry + dx * 1.15)
    setRotX(Math.max(-24, Math.min(24, dragRef.current.rx - dy * 0.4)))
  }
  const onPointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    setRotX(6)
  }

  const imgSrc = locked ? `./smitrix-ui/badges/${id}_off.webp` : `./smitrix-ui/badges/${id}.webp`
  return (
    <div
      className="gm-medal-stage"
      style={{ width: size, height: size }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => setRotY(r => r + 360)}
      title={t('Drag or tap to spin medal')}
    >
      <div
        className="gm-medal-coin"
        style={{
          width: size,
          height: size,
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transition: dragRef.current ? 'none' : 'transform 780ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="gm-medal-face">
          <img
            src={imgSrc}
            alt={name || id}
            style={{ width: size, height: size, objectFit: 'contain', filter: locked ? 'grayscale(0.75) opacity(0.55)' : 'drop-shadow(0 12px 24px rgba(0,0,0,0.45))' }}
            draggable={false}
          />
          {!locked && <div className="gm-medal-sheen" style={{ opacity: 0.45 + 0.35 * Math.abs(Math.sin((rotY * Math.PI) / 180)) }} />}
        </div>
        <div className="gm-medal-face gm-medal-back">
          {handle && <div style={{ fontSize: size * 0.08, fontWeight: 700, opacity: 0.72 }}>@{handle}</div>}
          <div style={{ fontSize: size * 0.1, fontWeight: 900, letterSpacing: '0.06em', marginTop: 4, textTransform: 'uppercase' }}>
            {name}
          </div>
          {date && <div style={{ fontSize: size * 0.08, fontWeight: 700, marginTop: 5, opacity: 0.8 }}>{date}</div>}
          <div style={{ fontSize: size * 0.065, fontWeight: 800, letterSpacing: '0.2em', marginTop: 8, opacity: 0.65 }}>
            SMITRIX
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Fullscreen Award Celebration Overlay ---------- */
export function AwardCelebration({ award, handle, onClose }) {
  if (!award) return null
  return (
    <div className="gm-countdown" style={{ zIndex: 9800, padding: 28 }} onClick={onClose} role="dialog">
      <Confetti />
      <div className="gm-micro" style={{ color: 'var(--acc)', letterSpacing: '0.22em', marginBottom: 18 }}>
        {t('MEDAL UNLOCKED')}
      </div>
      <div onClick={e => e.stopPropagation()}>
        <MedalSpin id={award.id} name={award.name} date={award.date} handle={handle} size={186} spinIn={true} />
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 900, marginTop: 22, letterSpacing: '-0.02em', textAlign: 'center' }}>
        {award.name}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--label-2)', textAlign: 'center', maxWidth: 300, marginTop: 8, lineHeight: 1.45 }}>
        {award.desc}
      </p>
      <button type="button" className="btn primary" style={{ maxWidth: 240, marginTop: 28 }} onClick={onClose}>
        {t('Awesome!')}
      </button>
    </div>
  )
}
