import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { exOr } from '../lib/exercises.js'
import { useUI } from '../store/useUI.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'

function MiniElapsed({ start }) {
  const [sec, setSec] = useState(() => Math.floor((Date.now() - (start || Date.now())) / 1000))
  useEffect(() => {
    const tick = () => setSec(Math.floor((Date.now() - (start || Date.now())) / 1000))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [start])
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}m ${s}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  const minimizedWorkout = useUI(s => s.minimizedWorkout)
  const A = S.active

  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const on = k => cur === k || (cur === 'history' && k === 'stats') || (cur === 'settings' && k === 'home') || (cur === 'muscles' && k === 'library')

  const startWorkout = () => {
    if (S.active) {
      useUI.setState({ minimizedWorkout: false })
      nav('/workout')
      return
    }
    const r = effectiveRoutine(S, todayISO())
    if (r && r.ex.length) { onStart(r.id); return }
    nav('/workout')
  }
  const Tab = ({ k, icon, to, label }) => (
    <button className={on(k) ? 'on' : ''} onClick={() => nav(to)}>
      <Icon name={icon} /><span>{label}</span>
    </button>
  )

  const showFloatingBar = !!A && (cur !== 'workout' || minimizedWorkout)
  const currentExName = A?.entries?.length
    ? (exerciseNameFor(exOr(A.entries[A.cur || 0]?.id)) || t('In progress'))
    : t('No exercise')

  return (
    <>
      {showFloatingBar && (
        <div className="hevy-floating-bar-wrapper">
          <div className="hevy-floating-bar" onClick={() => { useUI.setState({ minimizedWorkout: false }); nav('/workout') }}>
            <div className="hevy-floating-bar-left">
              <span className="hevy-floating-up"><Icon name="chevronUp" /></span>
              <span className="live-workout-pulse" />
              <div className="hevy-floating-info">
                <div className="hevy-floating-title">
                  <span>{A.name || t('Workout')}</span>
                  <span className="hevy-floating-dot">·</span>
                  <span className="hevy-floating-time">{A.backfill ? fmtDate(A.d, true) : <MiniElapsed start={A.start} />}</span>
                </div>
                <div className="hevy-floating-sub">
                  {currentExName}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="iconbtn hevy-floating-trash"
              aria-label={t('Discard')}
              title={t('Discard workout')}
              onClick={e => {
                e.stopPropagation()
                confirmSheet({
                  title: t('Discard workout?'),
                  message: t('The sets you logged in this session will be lost.'),
                  confirmText: t('Discard'),
                  danger: true,
                  onConfirm: () => {
                    useStore.getState().update(s => { s.active = null })
                    useUI.getState().stopRest()
                    useUI.getState().stopWork()
                    useUI.setState({ minimizedWorkout: false })
                    nav('/home')
                  }
                })
              }}
            >
              <Icon name="trash" />
            </button>
          </div>
        </div>
      )}
      <nav id="tabbar">
        <Tab k="home" icon="house" to="/home" label={t('Home')} />
        <Tab k="plan" icon="calendar" to="/plan" label={t('Plan')} />
        <button className={'start' + (S.active ? ' rec' : '') + (S.active && cur === 'workout' && !minimizedWorkout ? ' on' : '')} onClick={startWorkout}>
          <span className="cir"><Icon name={S.active ? (cur === 'workout' && !minimizedWorkout ? 'dumbbell' : 'play') : 'dumbbell'} /></span>
          <span>{S.active ? (cur === 'workout' && !minimizedWorkout ? t('Workout') : t('Resume')) : t('Start')}</span>
        </button>
        <Tab k="stats" icon="chart" to="/stats" label={t('Stats')} />
        <Tab k="library" icon="list" to="/library" label={t('Exercises')} />
      </nav>
    </>
  )
}
