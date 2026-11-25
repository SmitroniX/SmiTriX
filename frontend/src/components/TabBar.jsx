import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { exOr } from '../lib/exercises.js'
import { openStartSheet } from './StartSheet.jsx'
import Icon from './Icon.jsx'

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
  const [dragIdx, setDragIdx] = useState(null)
  const barRef = useRef(null)
  const holdTimer = useRef(null)

  const hidden = (!user && !isGuest) || loc.pathname.startsWith('/login')
  const cur = loc.pathname.split('/')[1] || 'home'
  const showParked = !hidden && !!S.active && cur !== 'workout'

  useEffect(() => {
    document.body.classList.toggle('gm-has-parked', showParked)
    return () => document.body.classList.remove('gm-has-parked')
  }, [showParked])

  if (hidden) return null

  const on = k =>
    cur === k ||
    ((cur === 'plan' || cur === 'tools' || cur === 'journal' || cur === 'nutrition' || cur === 'recovery' || cur === 'places' || cur === 'ai-plan' || cur === 'train') && k === 'home') ||
    ((cur === 'history' || cur === 'measures' || cur === 'timeline' || cur === 'compare') && k === 'stats') ||
    (cur === 'muscles' && k === 'library') ||
    ((cur === 'settings' || cur === 'checkin' || cur === 'admin' || cur === 'plans' || cur === 'awards') && k === 'profile')

  const activeSlot = dragIdx !== null
    ? dragIdx
    : on('stats') ? 1 : on('library') ? 2 : on('profile') ? 3 : 0

  // Map 4 tab slots across the 5-column grid (col 0, col 1, [FAB col 2], col 3, col 4)
  const pillStyle = (() => {
    // 5-col grid: 1fr 1fr 60px 1fr 1fr inside padding 12px
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

  const slotToRoute = ['/home', '/stats', '/library', '/profile']
  const nearestSlot = clientX => {
    const el = barRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const frac = (clientX - rect.left) / Math.max(1, rect.width)
    if (frac < 0.22) return 0
    if (frac < 0.44) return 1
    if (frac < 0.56) return null
    if (frac < 0.78) return 2
    return 3
  }

  const activeEx = S.active?.entries?.[S.active?.idx || 0]
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
          <img src="/icon-180.png" alt="SmiTriX" />
          <b>SmiTriX</b>
        </div>
        <button type="button" className="gm-side-start" onClick={startWorkout}>
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

      {/* Mobile Floating Glass 5-Slot Pill Navigation */}
      <nav
        id="tabbar"
        ref={barRef}
        onTouchMove={e => {
          const s = nearestSlot(e.touches[0].clientX)
          if (s !== null) setDragIdx(s)
        }}
        onTouchEnd={() => {
          if (dragIdx !== null) {
            nav(slotToRoute[dragIdx])
            setDragIdx(null)
          }
        }}
      >
        <div className="gm-nav-liquid" style={pillStyle} aria-hidden="true" />

        <button className={on('home') ? 'on' : ''} onClick={() => nav('/home')} aria-label={t('Home')}>
          <Icon name="house" />
          <span className="gm-tab-lbl">{t('Home')}</span>
        </button>

        <button className={on('stats') ? 'on' : ''} onClick={() => nav('/stats')} aria-label={t('Progress')}>
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

        <button className={on('library') ? 'on' : ''} onClick={() => nav('/library')} aria-label={t('Exercises')}>
          <Icon name="dumbbell" />
          <span className="gm-tab-lbl">{t('Exercises')}</span>
        </button>

        <button className={on('profile') ? 'on' : ''} onClick={() => nav('/profile')} aria-label={t('Profile')}>
          <Icon name="personCircle" />
          <span className="gm-tab-lbl">{t('Profile')}</span>
        </button>
      </nav>
    </>
  )
}
