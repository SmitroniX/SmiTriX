import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { exOr } from '../lib/exercises.js'
import { MOBILE } from '../lib/mobile.js'
import { openStartSheet } from './StartSheet.jsx'
import Icon from './Icon.jsx'

// Exact cubic-bezier evaluator for GymMane's dual-curve elastic liquid pill
function makeCubicBezier(x1, y1, x2, y2) {
  const sampleX = u => ((1 - 3 * x2 + 3 * x1) * u + (3 * x2 - 6 * x1)) * u * u + 3 * x1 * u
  const sampleY = u => ((1 - 3 * y2 + 3 * y1) * u + (3 * y2 - 6 * y1)) * u * u + 3 * y1 * u
  const slopeX = u => (3 * (1 - 3 * x2 + 3 * x1) * u + 2 * (3 * x2 - 6 * x1)) * u + 3 * x1
  return tVal => {
    if (tVal <= 0) return 0
    if (tVal >= 1) return 1
    let u = tVal
    for (let i = 0; i < 6; i++) {
      const err = sampleX(u) - tVal
      const dx = slopeX(u)
      if (Math.abs(err) < 1e-4 || Math.abs(dx) < 1e-5) break
      u = Math.max(0, Math.min(1, u - err / dx))
    }
    return sampleY(u)
  }
}

const LEAD_CURVE = makeCubicBezier(0.2, 1.35, 0.35, 1.0)
const TRAIL_CURVE = makeCubicBezier(0.45, 0.0, 0.2, 1.0)
const LIQUID_MS = 460
const SLOT_ROUTES = ['/home', '/stats', '/library', '/profile']

function ParkedElapsed({ start }) {
  const [label, setLabel] = useState('0:00')
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - (start || Date.now())) / 1000))
      const m = Math.floor(s / 60)
      setLabel(`${m}:${String(s % 60).padStart(2, '0')}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [start])
  return <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--label-2)', fontVariantNumeric: 'tabular-nums' }}>{label}</span>
}

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())

  const [dragSlot, setDragSlot] = useState(null)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const barRef = useRef(null)
  const pillRef = useRef(null)
  const slotBtnRefs = useRef([null, null, null, null])
  const holdTimer = useRef(null)
  const prevSlotRef = useRef(null)
  const prevGeomRef = useRef(null)
  const rafRef = useRef(0)
  const scrubRef = useRef({ active: false, pointerId: null, startX: 0, moved: false, lastSlot: null })

  const hidden = (!user && !isGuest) || loc.pathname.startsWith('/login')
  const cur = loc.pathname.split('/')[1] || 'home'
  const showParked = !hidden && !!S.active && cur !== 'workout'

  useEffect(() => {
    document.body.classList.toggle('gm-has-parked', showParked)
    return () => document.body.classList.remove('gm-has-parked')
  }, [showParked])

  const on = k =>
    cur === k ||
    ((cur === 'plan' || cur === 'tools' || cur === 'journal' || cur === 'nutrition' || cur === 'recovery' || cur === 'places' || cur === 'ai-plan' || cur === 'train') && k === 'home') ||
    ((cur === 'history' || cur === 'measures' || cur === 'timeline' || cur === 'compare') && k === 'stats') ||
    (cur === 'muscles' && k === 'library') ||
    ((cur === 'settings' || cur === 'checkin' || cur === 'admin' || cur === 'plans' || cur === 'awards') && k === 'profile')

  const isWorkoutRoute = cur === 'workout'
  const routeSlot = on('stats') ? 1 : on('library') ? 2 : on('profile') ? 3 : 0
  const activeSlot = dragSlot !== null ? dragSlot : routeSlot

  const measureSlot = idx => {
    const bar = barRef.current
    const btn = slotBtnRefs.current[idx]
    if (!bar || !btn) return null
    const br = bar.getBoundingClientRect()
    const er = btn.getBoundingClientRect()
    if (!br.width || !er.width) return null
    const inset = 3
    return {
      left: er.left - br.left + inset,
      right: er.right - br.left - inset,
    }
  }

  // GymMane dual-curve elastic droplet travel whenever active tab changes
  useLayoutEffect(() => {
    if (hidden) return
    const pill = pillRef.current
    if (!pill) return

    // If user is actively finger-scrubbing, pointer handler positions the pill directly
    if (isScrubbing) return

    const target = measureSlot(activeSlot)
    if (!target) return

    cancelAnimationFrame(rafRef.current)
    const from = prevGeomRef.current
    const prevSlot = prevSlotRef.current
    prevSlotRef.current = activeSlot

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!from || prevSlot === null || prevSlot === activeSlot || reduced) {
      pill.style.left = `${target.left}px`
      pill.style.width = `${Math.max(24, target.right - target.left)}px`
      pill.style.transform = 'scaleY(1)'
      prevGeomRef.current = target
      return
    }

    const goingRight = target.left > from.left
    const startTs = performance.now()

    const step = now => {
      const tVal = Math.min(1, (now - startTs) / LIQUID_MS)
      const lead = LEAD_CURVE(tVal)
      const trail = TRAIL_CURVE(tVal)
      const left = from.left + (target.left - from.left) * (goingRight ? trail : lead)
      const right = from.right + (target.right - from.right) * (goingRight ? lead : trail)
      const squash = 1 - 0.14 * (1 - Math.abs(2 * tVal - 1))

      pill.style.left = `${left}px`
      pill.style.width = `${Math.max(24, right - left)}px`
      pill.style.transform = `scaleY(${squash.toFixed(4)})`

      if (tVal < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        pill.style.left = `${target.left}px`
        pill.style.width = `${Math.max(24, target.right - target.left)}px`
        pill.style.transform = 'scaleY(1)'
        prevGeomRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [activeSlot, hidden, isScrubbing, loc.pathname])

  // Re-sync droplet geometry on window resize / orientation change
  useEffect(() => {
    if (hidden) return
    const onResize = () => {
      const g = measureSlot(activeSlot)
      const pill = pillRef.current
      if (!g || !pill) return
      pill.style.left = `${g.left}px`
      pill.style.width = `${Math.max(24, g.right - g.left)}px`
      pill.style.transform = 'scaleY(1)'
      prevGeomRef.current = g
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [activeSlot, hidden])

  if (hidden) return null

  // Fallback CSS position for non-layout test environments (happy-dom)
  const fallbackStyle = (() => {
    const positions = [
      { left: '12px', width: 'calc((100% - 84px) / 4)' },
      { left: 'calc(12px + (100% - 84px) / 4)', width: 'calc((100% - 84px) / 4)' },
      { left: 'calc(12px + (100% - 84px) / 2 + 60px)', width: 'calc((100% - 84px) / 4)' },
      { left: 'calc(12px + 3 * (100% - 84px) / 4 + 60px)', width: 'calc((100% - 84px) / 4)' },
    ]
    return positions[activeSlot] || positions[0]
  })()

  const startWorkout = () => {
    if (S.active) {
      nav('/workout')
      return
    }
    const r = effectiveRoutine(S, todayISO())
    if (r && r.ex?.length && onStart) {
      onStart(r.id)
      return
    }
    openStartSheet()
  }

  const startLongPress = () => {
    clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null
      openStartSheet()
    }, 450)
  }
  const endLongPress = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  const nearestSlot = clientX => {
    const el = barRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    if (!rect.width) return null
    const frac = (clientX - rect.left) / rect.width
    if (frac < 0.22) return 0
    if (frac < 0.43) return 1
    if (frac < 0.57) return null
    if (frac < 0.78) return 2
    return 3
  }

  const positionScrubPill = clientX => {
    const bar = barRef.current
    const pill = pillRef.current
    if (!bar || !pill) return
    const br = bar.getBoundingClientRect()
    if (!br.width) return
    const sample = measureSlot(0)
    const baseW = sample ? (sample.right - sample.left) : (br.width - 84) / 4
    const scrubW = baseW + 10
    const x = Math.max(8, Math.min(br.width - scrubW - 8, clientX - br.left - scrubW / 2))
    cancelAnimationFrame(rafRef.current)
    pill.style.left = `${x}px`
    pill.style.width = `${scrubW}px`
    pill.style.transform = 'scaleY(1.06)'
    prevGeomRef.current = { left: x, right: x + scrubW }
  }

  const beginScrub = (clientX, pointerId = null, target = null) => {
    if (target?.closest?.('button.start')) return
    scrubRef.current = { active: true, pointerId, startX: clientX, moved: false, lastSlot: activeSlot }
  }

  const moveScrub = clientX => {
    const st = scrubRef.current
    if (!st.active) return
    if (!st.moved && Math.abs(clientX - st.startX) < 10) return
    if (!st.moved) {
      st.moved = true
      setIsScrubbing(true)
    }
    positionScrubPill(clientX)
    const s = nearestSlot(clientX)
    if (s !== null && s !== st.lastSlot) {
      st.lastSlot = s
      setDragSlot(s)
      try { navigator.vibrate?.(10) } catch {}
    }
  }

  const endScrub = () => {
    const st = scrubRef.current
    if (!st.active) return
    const wasMoved = st.moved
    const targetSlot = st.lastSlot
    scrubRef.current = { active: false, pointerId: null, startX: 0, moved: false, lastSlot: null }
    setIsScrubbing(false)
    if (wasMoved && targetSlot !== null && SLOT_ROUTES[targetSlot]) {
      setDragSlot(null)
      nav(SLOT_ROUTES[targetSlot])
    } else {
      setDragSlot(null)
    }
  }

  const activeEx = S.active?.entries?.[S.active?.cur ?? S.active?.idx ?? 0]
  const activeExDef = activeEx ? exOr(activeEx.id) : null
  const activeExName = activeExDef ? exerciseNameFor(activeExDef) : (S.active?.name || t('Workout'))

  const sideLinks = [
    { k: 'home', icon: 'house', to: '/home', label: t('Home') },
    { k: 'stats', icon: 'chartLine', to: '/stats', label: t('Progress') },
    { k: 'library', icon: 'dumbbell', to: '/library', label: t('Exercises') },
    { k: 'profile', icon: 'personCircle', to: '/profile', label: t('Profile') },
  ]
  const sideExtras = [
    { k: 'plan', icon: 'clipboard', to: '/plan', label: t('Routines') },
    { k: 'journal', icon: 'notebook', to: '/journal', label: t('Journal') },
    { k: 'tools', icon: 'calculator', to: '/tools', label: t('Tools') },
    ...(S.nutritionOn !== false ? [{ k: 'nutrition', icon: 'forkKnife', to: '/nutrition', label: t('Nutrition') }] : []),
    ...(S.recoveryOn !== false ? [{ k: 'recovery', icon: 'thermometer', to: '/recovery', label: t('Recovery') }] : []),
    { k: 'places', icon: 'mapPin', to: '/places', label: t('Places') },
  ]

  return (
    <>
      {/* Desktop responsive sidebar (GymMane desktop.dart) */}
      <aside className="gm-sidebar" aria-label={t('Sidebar navigation')}>
        <div className="gm-side-brand">
          <img src="./icon-180.png" alt="SmiTriX" />
          <div>
            <b>SmiTriX</b>
            <div className="gm-side-status">
              <span className="gm-side-dot" />
              <span>{MOBILE && user?.firebase ? t('Cloud Synced') : t('Local-first')}</span>
            </div>
          </div>
        </div>
        <button type="button" className={'gm-side-start' + (S.active ? ' rec' : '')} onClick={startWorkout}>
          <Icon name="playFill" style={{ fontSize: 14 }} />
          <span>{S.active ? t('Resume Workout') : t('Start Workout')}</span>
        </button>
        {sideLinks.map(item => (
          <button
            key={item.k}
            type="button"
            className={'gm-side-item' + (on(item.k) ? ' on' : '')}
            onClick={() => nav(item.to)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="gm-side-sep" />
        {sideExtras.map(item => (
          <button
            key={item.k}
            type="button"
            className={'gm-side-item sm' + (cur === item.k ? ' on' : '')}
            onClick={() => nav(item.to)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="gm-side-spacer" />
        <button
          type="button"
          className={'gm-side-item sm' + (cur === 'settings' ? ' on' : '')}
          onClick={() => nav('/settings')}
        >
          <Icon name="gear" />
          <span>{t('Settings')}</span>
        </button>
      </aside>

      {/* Parked Live Session Floating Pill */}
      {showParked && (
        <div className="gm-parked-pill" onClick={() => nav('/workout')} role="button" tabIndex={0}>
          <span className="gm-parked-dot" aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="gm-micro" style={{ fontSize: 10, color: 'var(--gm-sage)' }}>
              {t('IN PROGRESS')}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
              {activeExName}
            </div>
          </div>
          <ParkedElapsed start={S.active?.start} />
          <span className="gm-parked-play">
            <Icon name="playFill" style={{ fontSize: 15, marginLeft: 2 }} />
          </span>
        </div>
      )}

      {/* Soft bottom gradient fade */}
      <div className="gm-edge-blur-bottom" aria-hidden="true" />

      {/* Mobile Floating Glass 5-Slot Pill Navigation with GymMane Elastic Liquid Droplet */}
      <nav
        id="tabbar"
        ref={barRef}
        className={isScrubbing ? 'gm-scrubbing' : ''}
        onPointerDown={e => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          beginScrub(e.clientX, e.pointerId, e.target)
        }}
        onPointerMove={e => {
          if (scrubRef.current.active && scrubRef.current.pointerId === e.pointerId) {
            moveScrub(e.clientX)
          }
        }}
        onPointerUp={e => {
          if (scrubRef.current.pointerId === e.pointerId) endScrub()
        }}
        onPointerCancel={() => endScrub()}
        onTouchStart={e => {
          if (e.touches?.[0]) beginScrub(e.touches[0].clientX, 'touch', e.target)
        }}
        onTouchMove={e => {
          if (e.touches?.[0]) moveScrub(e.touches[0].clientX)
        }}
        onTouchEnd={() => endScrub()}
        onTouchCancel={() => endScrub()}
      >
        <div
          ref={pillRef}
          className={'gm-nav-liquid' + (isScrubbing ? ' dragging' : '') + (isWorkoutRoute && !isScrubbing ? ' dim-slot' : '')}
          style={fallbackStyle}
          aria-hidden="true"
        />

        <button
          ref={el => { slotBtnRefs.current[0] = el }}
          className={(on('home') ? 'on' : '') + (isScrubbing && dragSlot === 0 ? ' hover-lift' : '')}
          onClick={() => nav('/home')}
          aria-label={t('Home')}
        >
          <Icon name="house" />
          <span className="gm-tab-lbl">{t('Home')}</span>
        </button>

        <button
          ref={el => { slotBtnRefs.current[1] = el }}
          className={(on('stats') ? 'on' : '') + (isScrubbing && dragSlot === 1 ? ' hover-lift' : '')}
          onClick={() => nav('/stats')}
          aria-label={t('Progress')}
        >
          <Icon name="chartLine" />
          <span className="gm-tab-lbl">{t('Progress')}</span>
        </button>

        <button
          className={'start' + (S.active ? ' rec' : '') + (cur === 'workout' ? ' on' : '')}
          onClick={startWorkout}
          onContextMenu={e => { e.preventDefault(); openStartSheet() }}
          onTouchStart={startLongPress}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          aria-label={S.active ? t('Resume') : t('Workout')}
        >
          <span className="cir"><Icon name="playFill" /></span>
          <span className="gm-tab-lbl">{S.active ? t('Resume') : t('Workout')}</span>
        </button>

        <button
          ref={el => { slotBtnRefs.current[2] = el }}
          className={(on('library') ? 'on' : '') + (isScrubbing && dragSlot === 2 ? ' hover-lift' : '')}
          onClick={() => nav('/library')}
          aria-label={t('Exercises')}
        >
          <Icon name="dumbbell" />
          <span className="gm-tab-lbl">{t('Exercises')}</span>
        </button>

        <button
          ref={el => { slotBtnRefs.current[3] = el }}
          className={(on('profile') ? 'on' : '') + (isScrubbing && dragSlot === 3 ? ' hover-lift' : '')}
          onClick={() => nav('/profile')}
          aria-label={t('Profile')}
        >
          <Icon name="personCircle" />
          <span className="gm-tab-lbl">{t('Profile')}</span>
        </button>
      </nav>
    </>
  )
}
