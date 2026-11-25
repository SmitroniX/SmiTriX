import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { fmtNum, fmtVol, todayISO, weekOrder, weekStartOf, DAYS } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { workoutVolume } from '../lib/history.js'
import { t, dateLocale, exerciseNameFor } from '../lib/i18n.js'
import { workoutDetailSheet, logPastWorkoutSheet, calendarSheet } from '../sheets.jsx'
import { Rise, RollIn, CollapsedHeader } from '../components/GymManeMotion.jsx'
import Icon from '../components/Icon.jsx'

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function summarizeMonth(workouts, mDate) {
  const key = monthKey(mDate)
  const list = (workouts || []).filter(w => String(w.d || '').slice(0, 7) === key)
  let sets = 0
  let seconds = 0
  let volume = 0
  for (const w of list) {
    volume += workoutVolume(w)
    const dur = w.start && w.end && w.end > w.start ? Math.round((w.end - w.start) / 1000) : 2700
    seconds += dur
    for (const e of w.entries || []) {
      for (const s of e.sets || []) if (s.done) sets++
    }
  }
  return { list: list.slice().reverse(), workouts: list.length, sets, seconds, volume }
}

function WorkoutHistoryCard({ w, unit, onOpen }) {
  const dt = w.start ? new Date(w.start) : new Date(`${w.d}T12:00:00`)
  const locale = dateLocale()
  const dow = dt.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase()
  const dayNum = dt.getDate()
  const clock = w.start ? dt.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : ''
  const durMin = w.start && w.end && w.end > w.start ? Math.max(1, Math.round((w.end - w.start) / 60000)) : 0
  const meta = [clock, durMin ? `${durMin} min` : ''].filter(Boolean).join(' · ')
  const prs = (w.prs || []).length
  const shown = (w.entries || []).slice(0, 4)
  const extra = Math.max(0, (w.entries || []).length - shown.length)

  return (
    <button
      type="button"
      className="gm-history-card"
      onClick={onOpen}
    >
      <div className="gm-history-card-top">
        <div className="gm-history-date">
          <span className="gm-history-dow">{dow}</span>
          <span className="gm-history-day">{dayNum}</span>
        </div>
        <div className="gm-history-meta-col">
          <div className="gm-history-title">{w.name || t('Workout')}</div>
          {meta && <div className="gm-history-sub">{meta}</div>}
        </div>
        {prs > 0 && (
          <span className="gm-history-pr">
            <Icon name="trophy" style={{ fontSize: 11 }} />
            <span>{prs}</span>
          </span>
        )}
      </div>

      {shown.length > 0 && (
        <>
          <div className="gm-history-div" />
          <div className="gm-history-exlist">
            {shown.map((e, idx) => {
              const ex = exOr(e.id)
              const doneSets = (e.sets || []).filter(s => s.done)
              const top = doneSets.reduce((best, s) => ((s.w || 0) > (best?.w || 0) ? s : best), doneSets[0])
              const topStr = top
                ? (top.w > 0 ? `${fmtNum(top.w)} ${unit} × ${top.r || 0}` : top.r ? `${top.r} ${t('reps')}` : top.sec ? `${top.sec}s` : '')
                : ''
              return (
                <div key={`${e.id}-${idx}`} className="gm-history-exrow">
                  <span className="gm-history-exname">
                    <b>{doneSets.length || (e.sets || []).length}×</b> {exerciseNameFor(ex)}
                  </span>
                  {topStr && <span className="gm-history-extop">{topStr}</span>}
                </div>
              )
            })}
            {extra > 0 && (
              <div className="gm-history-more">+{extra} {t('more')}</div>
            )}
          </div>
        </>
      )}
    </button>
  )
}

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const ws = weekStartOf(S)
  const latestMonth = useMemo(() => monthStart(new Date()), [])
  const [month, setMonth] = useState(() => latestMonth)
  const swipeRef = useRef({ x: 0, y: 0, active: false })

  const atLatest = monthKey(month) >= monthKey(latestMonth)
  const cur = useMemo(() => summarizeMonth(S.workouts, month), [S.workouts, month])
  const prev = useMemo(() => summarizeMonth(S.workouts, shiftMonth(month, -1)), [S.workouts, month])
  const deltaWorkouts = cur.workouts - prev.workouts

  const trainedByDay = useMemo(() => {
    const map = new Map()
    for (const w of cur.list) {
      const dayNum = Number(String(w.d || '').slice(8, 10))
      if (dayNum >= 1 && dayNum <= 31) {
        if (!map.has(dayNum)) map.set(dayNum, [])
        map.get(dayNum).push(w)
      }
    }
    return map
  }, [cur.list])

  const hours = Math.floor(cur.seconds / 3600)
  const minutes = Math.floor((cur.seconds % 3600) / 60)
  const timeStr = hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}` : `${minutes}m`
  const monthLabel = month.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })

  const shift = delta => {
    if (delta > 0 && atLatest) return
    setMonth(m => shiftMonth(m, delta))
  }

  // Monthly calendar matrix aligned to user's week start
  const cal = useMemo(() => {
    const year = month.getFullYear()
    const mIdx = month.getMonth()
    const firstDow = new Date(year, mIdx, 1).getDay()
    const daysInMonth = new Date(year, mIdx + 1, 0).getDate()
    const lead = (firstDow - ws + 7) % 7
    const today = todayISO()
    const cells = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        n: d,
        iso,
        trained: trainedByDay.has(d),
        sessions: trainedByDay.get(d) || [],
        isToday: iso === today,
        isFuture: iso > today,
      })
    }
    return cells
  }, [month, ws, trainedByDay])

  const onTouchStart = e => {
    const pt = e.touches?.[0]
    if (!pt) return
    swipeRef.current = { x: pt.clientX, y: pt.clientY, active: true }
  }

  const onTouchEnd = e => {
    if (!swipeRef.current.active) return
    swipeRef.current.active = false
    const pt = e.changedTouches?.[0]
    if (!pt) return
    const dx = pt.clientX - swipeRef.current.x
    const dy = pt.clientY - swipeRef.current.y
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      shift(dx > 0 ? -1 : 1)
    }
  }

  return (
    <div className="narrow" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <CollapsedHeader title={t('History')} />

      <div className="hdr" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
            <Icon name="chevronLeft" />
          </button>
          <div>
            <h1 style={{ fontSize: 26 }}>{t('History')}</h1>
            <div className="sub">{t('{0} workouts', (S.workouts || []).length)}</div>
          </div>
        </div>
        <button type="button" className="iconbtn" onClick={logPastWorkoutSheet} aria-label={t('Log a past workout')} title={t('Log a past workout')}>
          <Icon name="plus" />
        </button>
      </div>

      {/* GymMane Month Card (4 stats + delta + interactive calendar grid) */}
      <Rise index={0}>
        <div className="card gm-month-card" style={{ padding: '14px 16px 16px', marginBottom: 20 }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <button type="button" className="gm-month-arrow" onClick={() => shift(-1)} aria-label={t('Previous month')}>
              <Icon name="chevronLeft" />
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'capitalize' }}>{monthLabel}</div>
            <button
              type="button"
              className="gm-month-arrow"
              disabled={atLatest}
              style={{ opacity: atLatest ? 0.3 : 1 }}
              onClick={() => shift(1)}
              aria-label={t('Next month')}
            >
              <Icon name="chevronRight" />
            </button>
          </div>

          <div className="gm-month-stats">
            <div>
              <div className="gm-month-stat-val"><RollIn value={cur.workouts} /></div>
              <div className="gm-micro" style={{ fontSize: 9, marginTop: 3 }}>{t('WORKOUTS')}</div>
              {deltaWorkouts !== 0 && (
                <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: deltaWorkouts > 0 ? 'var(--gm-sage)' : 'var(--label-3)' }}>
                  {deltaWorkouts > 0 ? '↑' : '↓'} {Math.abs(deltaWorkouts)}
                </div>
              )}
            </div>
            <div>
              <div className="gm-month-stat-val">{timeStr}</div>
              <div className="gm-micro" style={{ fontSize: 9, marginTop: 3 }}>{t('TIME')}</div>
            </div>
            <div>
              <div className="gm-month-stat-val"><RollIn value={cur.sets} /></div>
              <div className="gm-micro" style={{ fontSize: 9, marginTop: 3 }}>{t('SETS')}</div>
            </div>
            <div>
              <div className="gm-month-stat-val">{fmtVol(cur.volume, S.unit)}</div>
              <div className="gm-micro" style={{ fontSize: 9, marginTop: 3 }}>{t('VOLUME')}</div>
            </div>
          </div>

          <div style={{ height: 1, background: 'color-mix(in srgb, var(--sep) 55%, transparent)', margin: '14px 0 12px' }} />

          {/* Weekday headers */}
          <div className="gm-cal-grid gm-cal-hdr">
            {weekOrder(ws).map(d => (
              <div key={d} className="gm-cal-dow">{t(DAYS[d]).slice(0, 1).toUpperCase()}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="gm-cal-grid">
            {cal.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} className="gm-cal-cell" />
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={cell.isFuture}
                  className="gm-cal-cell"
                  onClick={() => {
                    if (cell.sessions.length === 1) workoutDetailSheet(cell.sessions[0])
                    else if (cell.sessions.length > 1) calendarSheet(cell.iso)
                    else logPastWorkoutSheet(cell.iso)
                  }}
                >
                  <span className={'gm-cal-dot' + (cell.trained ? ' on' : '') + (cell.isToday ? ' today' : '') + (cell.isFuture ? ' future' : '')}>
                    {cell.n}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Rise>

      {/* Month Session Cards */}
      {cur.list.length > 0 ? (
        <>
          <div className="gm-micro" style={{ marginBottom: 10 }}>
            {t('{0} workouts', cur.list.length)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cur.list.map((w, i) => (
              <Rise key={w.id} index={Math.min(i + 1, 8)}>
                <WorkoutHistoryCard w={w} unit={S.unit} onOpen={() => workoutDetailSheet(w)} />
              </Rise>
            ))}
          </div>
        </>
      ) : (
        <Rise index={1}>
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 28, color: 'var(--label-3)', marginBottom: 10 }}>
              <Icon name="calendar" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('No workouts this month')}</div>
            <div className="dim small">{t('Swipe to check another month or tap + to log a past session.')}</div>
          </div>
        </Rise>
      )}
    </div>
  )
}
