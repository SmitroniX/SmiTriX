import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { EXIDX, exOr, matchExercise } from '../lib/exercises.js'
import { lastBW, setLabel, modeOf, metricModeForEntry, metricRowsForEntry, bestWeightForEntry, workoutVolume } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekOrder, weekStartOf, DAYS } from '../lib/format.js'
import { t, exerciseNameFor, getLang } from '../lib/i18n.js'
import { bwSheet, calendarSheet, workoutDetailSheet, exerciseDetailSheet } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Heatmap from '../components/Heatmap.jsx'
import Icon from '../components/Icon.jsx'
import BodyMap, { BodyMapLegend } from '../components/BodyMap.jsx'
import { loadOfWorkouts, muscleBalanceWindow, rankOf, MUSCLE_NAME, musclesOf } from '../lib/muscles.js'
import { fatigueOf, strengthOf, STRENGTH_FLOOR, LB_TO_KG } from '../lib/recovery.js'
import { calculateMuscleRecoveryHours } from '../lib/readiness.js'
import { strengthExerciseRowsForMuscle } from '../lib/strength-exercises.js'
import { fatigueStateOf } from '../lib/recovery-view.js'
import { e1rmSeries, best1RM } from '../lib/onerm.js'
import { isHardSet } from '../lib/effort.js'
import { Button, Segmented, SelectRow } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { isWarmupRow } from '../lib/workout-model.js'
import { dayStreakWithOff } from '../lib/gymmane-awards.js'
import { Rise, RollIn, CollapsedHeader } from '../components/GymManeMotion.jsx'
import MuscleRadar from '../components/MuscleRadar.jsx'

const HEAT_TONES = [
  { id: 'ember', dots: ['#7A4028', '#E38B3A', '#FFC168'] },
  { id: 'green', dots: ['#1B4B2C', '#3FA95C', '#63D67F'] },
  { id: 'blue', dots: ['#1E3A5C', '#3D86C9', '#6EB4F0'] },
  { id: 'mono', dots: ['#3A3A3A', '#8C8C8C', '#D8D8D8'] },
]

function Sparkline({ values = [], height = 38, color = 'var(--acc)' }) {
  if (!values || values.length < 2) return <div style={{ height }} />
  const w = 140
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = height - pad - ((v - min) / span) * (height - pad * 2)
    return [x, y]
  })
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height, display: 'block', overflow: 'visible' }} aria-hidden="true">
      <path d={area} fill={color} opacity="0.14" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  )
}

function latestMuscleTraining(workouts) {
  const latest = {}
  for (const workout of workouts || []) {
    const timestamp = Number(workout?.start || new Date(workout?.d).getTime())
    if (!Number.isFinite(timestamp)) continue
    for (const entry of workout.entries || []) {
      if (!(entry.sets || []).some(set => set?.done === true && !isWarmupRow(set))) continue
      const exercise = EXIDX[entry.id] || entry.exercise || entry
      for (const slug of Object.keys(musclesOf(exercise))) {
        if (latest[slug] == null || timestamp > latest[slug]) latest[slug] = timestamp
      }
    }
  }
  return latest
}

export const FATIGUE_LEVELS = [
  { at: 0, level: 0 },
  { at: 0.15, level: 1 },
  { at: 0.25, level: 2 },
  { at: 0.4, level: 3 },
  { at: 0.55, level: 4, exclusive: true },
]

export const STRENGTH_LEVELS = [
  { at: STRENGTH_FLOOR, level: 0 },
  { at: 0.625, level: 1 },
  { at: 0.75, level: 2 },
  { at: 0.875, level: 3 },
  { at: 1, level: 4 },
]

function useNow() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(tick => tick + 1), 60000)
    return () => clearInterval(iv)
  }, [])
  return Date.now()
}

export function weeksSinceTraining(now, lastTrained) {
  return Math.max(0, Math.floor((now - lastTrained) / 86400000 / 7))
}

function FatigueLegend() {
  return <div className="hm-legend hm-fatigue" aria-label={t('Fatigue')}>
    <span>{t('Fatigued')}</span><div className="hm-c l4" />
    <span>{t('Recovering')}</span><div className="hm-c l2" />
    <span>{t('Ready')}</span><div className="hm-c l0" />
  </div>
}

function StrengthLegend() {
  return <div className="hm-legend hm-strength" aria-label={t('Strength')}>
    <span>1 <span className="dim">{t('full')}</span></span><div className="hm-c l4" /><div className="hm-c l3" /><div className="hm-c l2" />
    <div className="hm-c l1" /><div className="hm-c l0" /><span>{fmtNum(STRENGTH_FLOOR)} <span className="dim">{t('floor')}</span></span>
  </div>
}

function fatigueLabel(value) {
  const state = fatigueStateOf(value)
  return t(state === 'ready' ? 'Ready' : state === 'recovering' ? 'Recovering' : 'Fatigued')
}

function MuscleBalance({ S, onExercise }) {
  const [view, setView] = useState('balance')
  const [win, setWin] = useState(7)
  const [hard, setHard] = useState(false)
  const [sel, setSel] = useState(null)
  const now = useNow()
  const lang = getLang()
  const workouts = S.workouts
  const bodyweightKg = useMemo(() => {
    const entries = S.bodyweight || []
    if (!entries.length) return null
    const last = entries.slice().sort((a, b) => String(a.d).localeCompare(String(b.d))).at(-1)
    if (!last || !(last.w > 0)) return null
    return S.unit === 'lb' ? last.w * LB_TO_KG : last.w
  }, [S.bodyweight, S.unit])
  const fatigue = useMemo(() => fatigueOf(workouts, now, { bodyweightKg, unit: S.unit }), [workouts, now, bodyweightKg, S.unit])
  const strength = useMemo(() => strengthOf(workouts, now, { bodyweightKg, unit: S.unit }), [workouts, now, bodyweightKg, S.unit])
  const muscleExercises = useMemo(() => (sel ? strengthExerciseRowsForMuscle(S, now, sel) : []), [S, now, sel, lang])
  const lastTrained = useMemo(() => latestMuscleTraining(workouts), [workouts])
  const strengthHint = slug => {
    if (lastTrained[slug] == null) return t('not trained')
    const weeks = weeksSinceTraining(now, lastTrained[slug])
    return t('Weeks since training: {0}', weeks)
  }
  const toggleSel = m => setSel(s => (s === m ? null : m))
  const inWin = muscleBalanceWindow(S.workouts, win, now, todayISO(), weekStartOf(S))
  const rated = inWin.some(w => w.entries.some(e => e.sets.some(s => s.done && isHardSet(s))))
  const on = hard && rated
  const load = loadOfWorkouts(inWin, on ? isHardSet : null)
  const volWin = S.workouts.filter(w => (w.start || new Date(w.d).getTime()) > now - 90 * 86400000)
  const vol90 = loadOfWorkouts(volWin, null)
  const { worked, missed } = rankOf(load)
  const { worked: strengthOrder } = rankOf(strength)
  const detrained = strengthOrder.filter(slug => strength[slug] < 1)
  const top = worked.slice(0, 4)
  const max = worked.length ? load[worked[0]] : 0
  const sets = m => fmtNum(Math.round((load[m] || 0) * 10) / 10)

  return (
    <div className="card">
      <Segmented
        className="seg-range"
        value={view}
        onChange={setView}
        options={[
          { value: 'balance', label: t('Muscle balance') },
          { value: 'fatigue', label: t('Fatigue') },
          { value: 'strength', label: t('Strength') },
        ]}
      />
      {view === 'balance' ? (
        <>
          <div className="row between" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>{t('Muscle balance')} <span className="dim" style={{ textTransform: 'none', letterSpacing: 0 }}>· {on ? t('by hard sets') : t('by sets worked')}</span></h2>
            {rated && (
              <Button size="sm" icon="flame" style={on ? { color: 'var(--yellow)' } : undefined} onClick={() => { setHard(h => !h); setSel(null) }}>
                {on ? t('Hard') : t('All')}
              </Button>
            )}
          </div>
          <Segmented
            className="seg-range"
            value={win}
            onChange={v => { setWin(v); setSel(null) }}
            options={[{ value: 7, label: t('Week') }, { value: 30, label: '30d' }, { value: 90, label: '90d' }, { value: 0, label: t('All') }]}
          />
          {inWin.length ? (
            <>
              <BodyMap className="tappable" load={load} body={S.body} selected={sel} onMuscle={toggleSel} />
              <BodyMapLegend />
              {sel && (
                <div className="mrow" style={{ borderTop: 'var(--hair) solid var(--sep)', marginTop: 4, paddingTop: 10 }}>
                  <span className="nm"><b>{t(MUSCLE_NAME[sel])}</b></span>
                  <span className="v">{sets(sel) ? t('{0} sets', sets(sel)) : on ? t('no hard sets') : t('not trained')}</span>
                </div>
              )}
              {!sel && top.map(m => (
                <div key={m} className="mrow">
                  <span className="nm">{t(MUSCLE_NAME[m])}</span>
                  <span className="bar"><i style={{ width: Math.round(load[m] / max * 100) + '%', background: on ? 'var(--yellow)' : undefined }} /></span>
                  <span className="v">{t('{0} sets', sets(m))}</span>
                </div>
              ))}
              {missed.length > 0 && (
                <>
                  <h4 className="sec" style={{ marginTop: 12 }}>{on ? t('No hard sets in this period') : t('Not trained in this period')}</h4>
                  <div className="mchips">{missed.map(m => <span key={m} className="mchip miss">{t(MUSCLE_NAME[m])}</span>)}</div>
                </>
              )}
              {!missed.length && worked.length > 0 && (
                <div className="muted small" style={{ marginTop: 10 }}>
                  {on ? t('Every muscle group got at least one hard set in this period.') : t('Every muscle group got some work in this period.')}
                </div>
              )}
            </>
          ) : (
            <div className="muted small">{t('No workouts in this period yet.')}</div>
          )}
        </>
      ) : view === 'fatigue' ? (
        <>
          <h2>{t('Fatigue')}</h2>
          <BodyMap className="tappable hm-fatigue" load={fatigue} thresholds={FATIGUE_LEVELS} body={S.body} selected={sel} onMuscle={toggleSel} />
          <FatigueLegend />
          <div className="muted small" style={{ marginTop: 10 }}>{t('Fatigue shows how recently each muscle was trained. High means rest.')}</div>
          {sel && (
            <div className="mrow" style={{ borderTop: 'var(--hair) solid var(--sep)', marginTop: 4, paddingTop: 10 }}>
              <span className="nm"><b>{t(MUSCLE_NAME[sel])}</b></span>
              <span className="v">
                {fatigueLabel(fatigue[sel])}
                {calculateMuscleRecoveryHours(fatigue[sel]) > 0 && (
                  <span className="dim small" style={{ display: 'block', fontWeight: 400 }}>
                    {t('~{0}h recovery needed', calculateMuscleRecoveryHours(fatigue[sel]))}
                  </span>
                )}
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <h2>{t('Strength')}</h2>
          <BodyMap className="tappable hm-strength" load={strength} thresholds={STRENGTH_LEVELS} body={S.body} selected={sel} onMuscle={toggleSel} />
          <StrengthLegend />
          <div className="muted small" style={{ marginTop: 10 }}>{t('Strength shows retained muscle strength. Train again to reset it.')}</div>
          {sel && (
            <>
              <h4 className="sec" style={{ marginTop: 14 }}>{t('Exercises')} · {t(MUSCLE_NAME[sel])}</h4>
              {muscleExercises.length ? muscleExercises.map(row => (
                <div key={row.id} className="mrow" style={{ minHeight: 48, alignItems: 'stretch', cursor: 'pointer' }} {...tappable(() => onExercise && onExercise(row.id))}>
                  <span className="nm" style={{ whiteSpace: 'normal', lineHeight: 1.35, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name}
                      {row.primary === sel
                        ? <span className="dim" style={{ fontSize: 11, marginLeft: 6 }}>{t('primary')}</span>
                        : <span className="dim" style={{ fontSize: 11, marginLeft: 6 }}>{t('secondary')}</span>}
                    </span>
                    <span className="small dim" style={{ display: 'block', fontWeight: 400 }}>{t('Est. 1RM')}: {fmtNum(row.est)} {S.unit} · {fmtDate(row.estDate, true)}</span>
                  </span>
                  <span className="bar" style={{ alignSelf: 'center' }}><i style={{ width: '100%', background: 'linear-gradient(to right, var(--acc) ' + Math.round(row.decay * 100) + '%, var(--surface-2) ' + Math.round(row.decay * 100) + '%)' }} /></span>
                  <span className="v" style={{ alignSelf: 'center' }}>{fmtNum(row.current)} {S.unit}<span className="dim"> · {Math.round(row.decay * 100)}%</span></span>
                </div>
              )) : <div className="muted small">{t('No exercises with an estimated 1RM yet.')}</div>}
            </>
          )}
          {!sel && <div className="muted small" style={{ marginTop: 10 }}>{t('Tap a muscle to see its exercises.')}</div>}
          {detrained.map(slug => {
            const sets90 = Math.round((vol90[slug] || 0) * 10) / 10
            return (
              <div key={slug} className="mrow">
                <span className="nm">{t(MUSCLE_NAME[slug])}</span>
                <span className="bar"><i style={{ width: Math.round(strength[slug] * 100) + '%' }} /></span>
                <span className="v" style={{ textAlign: 'right' }}>
                  {sets90 ? t('{0} sets', fmtNum(sets90)) : strengthHint(slug)}
                  {sets90 ? <span className="dim small" style={{ display: 'block', fontWeight: 400 }}>{strengthHint(slug)}</span> : null}
                </span>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// GymMane Progress Screen (05-progress.png)
export default function Stats() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [exId, setExId] = useState(null)
  const [exMetric, setExMetric] = useState('top')
  const now = Date.now()
  const workouts = S.workouts || []
  const ws = weekStartOf(S)
  const heatTone = S.heatTone || 'ember'

  const entryOf = id => workouts.flatMap(w => w.entries || []).find(e => e.id === id)
  const listOf = value => Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
  const firstAvailable = (...values) => {
    for (const value of values) {
      const list = listOf(value)
      if (list.length) return list
    }
    return []
  }
  const nameOf = id => {
    if (EXIDX[id]) return exerciseNameFor(EXIDX[id])
    const entry = entryOf(id)
    return entry?.muscleSnapshot?.n || entry?.n || id
  }
  const matcherOf = id => {
    if (EXIDX[id]) return EXIDX[id]
    const entry = entryOf(id)
    const snapshot = entry?.muscleSnapshot || {}
    const primaries = firstAvailable(snapshot.primaries, entry?.primaries)
    const secondaries = firstAvailable(
      snapshot.sm, snapshot.secondaries, snapshot.muscleGroups,
      entry?.sm, entry?.secondaries, entry?.muscleGroups,
    )
    return {
      n: snapshot.n || entry?.n || id,
      bp: snapshot.bp || entry?.bp || '',
      tg: primaries[0] || snapshot.tg || entry?.tg || '',
      sm: secondaries,
      eq: snapshot.eq || entry?.eq || '',
      desc: snapshot.desc || entry?.desc || '',
    }
  }
  const currentOf = id => {
    for (let i = workouts.length - 1; i >= 0; i--) {
      const en = (workouts[i].entries || []).find(e => e.id === id)
      if (!en) continue
      const mode = metricModeForEntry(en) || modeOf({ id })
      const rows = metricRowsForEntry(en, mode)
      const mx = mode === 'reps' ? bestWeightForEntry(en) : Math.max(0, ...rows.map(s => mode === 'cardio' ? (s.speed || 0) : mode === 'time' ? (s.sec || 0) : (s.w || 0)))
      if (mx > 0) return { mx, unit: mode === 'cardio' ? 'km/h' : mode === 'time' ? 's' : S.unit }
      if (mode === 'reps') {
        const reps = Math.max(0, ...rows.map(s => Number(s.r) || 0))
        if (reps > 0) return { mx: reps, unit: t('reps') }
      }
    }
    return { mx: 0, unit: S.unit }
  }

  const exHist = [...new Set(workouts.flatMap(w => (w.entries || []).map(e => e.id)))].filter(id => EXIDX[id] || nameOf(id) !== id)
  const exCurrent = Object.fromEntries(exHist.map(id => [id, currentOf(id)]))
  exHist.sort((a, b) => exCurrent[b].mx - exCurrent[a].mx || nameOf(a).localeCompare(nameOf(b)))
  const curEx = exId && exHist.includes(exId) ? exId : exHist[0] || null
  const curMode = curEx ? (() => {
    for (let i = workouts.length - 1; i >= 0; i--) {
      const en = (workouts[i].entries || []).find(e => e.id === curEx)
      if (en) {
        const mode = metricModeForEntry(en)
        if (mode) return mode
      }
    }
    return modeOf({ id: curEx })
  })() : 'reps'
  const curCardio = curMode === 'cardio'
  const curTimed = curMode === 'time'
  const repsOnly = curEx && curMode === 'reps' && !workouts.some(w => {
    const en = (w.entries || []).find(e => e.id === curEx)
    return en && bestWeightForEntry(en) > 0
  })
  const bestRepsOf = en => Math.max(0, ...metricRowsForEntry(en, 'reps').map(s => Number(s.r) || 0))
  const metric = s => curCardio ? (s.speed || 0) : curTimed ? (s.sec || 0) : (s.w || 0)
  const exUnit = curCardio ? 'km/h' : curTimed ? 's' : repsOnly ? t('reps') : S.unit
  let exPts = [], exList = [], exBest = 0
  if (curEx) {
    workouts.forEach(w => {
      const en = (w.entries || []).find(e => e.id === curEx)
      if (en) {
        const loggedMode = metricModeForEntry(en)
        if (loggedMode !== curMode) return
        const doneSets = metricRowsForEntry(en, curMode)
        const mx = curMode === 'reps'
          ? (repsOnly ? bestRepsOf(en) : bestWeightForEntry(en))
          : Math.max(0, ...doneSets.map(metric))
        if (mx > 0) {
          exPts.push({ t: w.start, y: mx, d: w.d, sets: doneSets, target: en.target })
          if (mx > exBest) exBest = mx
        }
      }
    })
    exList = exPts.slice(-5).reverse()
  }
  const e1Pts = useMemo(() => (curEx && curMode === 'reps' ? e1rmSeries(S, curEx) : []), [S, curEx, curMode])
  const e1ChartPts = useMemo(() => e1Pts.map(p => ({ t: p.t, y: p.y, d: p.d })), [e1Pts])
  const e1Best = curEx && curMode === 'reps' ? best1RM(S, curEx) : null
  const showE1 = e1Pts.length > 0
  const onE1 = showE1 && exMetric === 'e1rm'
  const topPts = exPts.map(p => ({ t: p.t, y: p.y, d: p.d }))

  // Hero 30D Volume & Sparkline
  const vol30 = useMemo(() => {
    const cut30 = now - 30 * 86400000
    const cut60 = now - 60 * 86400000
    let curV = 0
    let prevV = 0
    const recent = []
    for (const w of workouts) {
      const ts = w.start || new Date(w.d).getTime()
      const v = workoutVolume(w)
      if (ts >= cut30) { curV += v; recent.push(v) }
      else if (ts >= cut60) prevV += v
    }
    const pct = prevV > 0 ? Math.round(((curV - prevV) / prevV) * 100) : null
    return { curV, pct, spark: recent.slice(-10) }
  }, [workouts, now])

  // Bodyweight sparkline
  const bwSeries = useMemo(() => (S.bodyweight || []).slice(-12).map(b => b.w), [S.bodyweight])
  const latestBw = lastBW(S)

  // All-time totals
  const allTimeTotals = useMemo(() => {
    let sets = 0
    let vol = 0
    let mins = 0
    for (const w of workouts) {
      vol += workoutVolume(w)
      mins += w.start && w.end && w.end > w.start ? Math.round((w.end - w.start) / 60000) : 45
      for (const e of w.entries || []) for (const s of e.sets || []) if (s.done) sets++
    }
    return { sets, vol, hours: Math.round(mins / 60), mins }
  }, [workouts])

  // This Week 7-day set count bars
  const thisWeek = useMemo(() => {
    const today = new Date(); today.setHours(12, 0, 0, 0)
    const todayDow = today.getDay()
    const order = weekOrder(ws)
    const offsetInWeek = (todayDow - ws + 7) % 7
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - offsetInWeek)

    const days = order.map((dow, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      const iso = isoOf(d)
      let sets = 0
      for (const w of workouts) {
        if (w.d === iso) {
          for (const e of w.entries || []) for (const s of e.sets || []) if (s.done) sets++
        }
      }
      return { dow, label: t(DAYS[dow]).slice(0, 1).toUpperCase(), iso, sets, isToday: iso === todayISO() }
    })
    const totalSets = days.reduce((a, x) => a + x.sets, 0)
    const peak = Math.max(1, ...days.map(x => x.sets))
    const activeDays = days.filter(x => x.sets > 0).length
    return { days, totalSets, peak, activeDays }
  }, [workouts, ws])

  // Top Personal Records
  const topPRs = useMemo(() => {
    const bestByEx = new Map()
    for (const w of workouts) {
      for (const e of w.entries || []) {
        const bw = bestWeightForEntry(e)
        if (bw > 0) {
          const prev = bestByEx.get(e.id)
          if (!prev || bw > prev.w) bestByEx.set(e.id, { id: e.id, w: bw, d: w.d })
        }
      }
    }
    return [...bestByEx.values()]
      .sort((a, b) => b.w - a.w)
      .slice(0, 6)
      .map(p => ({ ...p, name: nameOf(p.id) }))
  }, [workouts])

  const streakDays = useMemo(() => dayStreakWithOff(S).current, [S.workouts, S.daysOff])

  return (
    <div className="narrow">
      <CollapsedHeader title={t('Progress')} />

      {/* GymMane Progress Header */}
      <div className="hdr" style={{ alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 30, letterSpacing: '-0.03em' }}>{t('Progress')}</h1>
        </div>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', height: 40, borderRadius: 999,
            background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--sep) 55%, transparent)',
            padding: '0 4px',
          }}
        >
          <button type="button" onClick={() => nav('/history')} aria-label={t('History')} title={t('History')} style={{ padding: '0 10px', height: 34, color: 'var(--label-2)', display: 'inline-flex', alignItems: 'center' }}>
            <Icon name="history" />
          </button>
          <span style={{ width: 1, height: 18, background: 'var(--sep)' }} />
          <button type="button" onClick={() => nav('/measures')} aria-label={t('Measures')} title={t('Body Measures')} style={{ padding: '0 10px', height: 34, color: 'var(--label-2)', display: 'inline-flex', alignItems: 'center' }}>
            <Icon name="ruler" />
          </button>
          <span style={{ width: 1, height: 18, background: 'var(--sep)' }} />
          <button type="button" onClick={() => nav('/timeline')} aria-label={t('Timeline')} title={t('Progress Photos & Timeline')} style={{ padding: '0 12px', height: 34, color: 'var(--acc)', fontWeight: 800, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="image" style={{ fontSize: 15 }} />
            <span>{t('Timeline')}</span>
          </button>
        </div>
      </div>

      {/* Hero Row: 30D Volume + Weight with GymMane Sparklines */}
      <Rise index={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className="gm-micro" style={{ fontSize: 10 }}>{t('VOLUME · 30D')}</span>
                {vol30.pct !== null && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: vol30.pct >= 0 ? 'var(--gm-sage)' : 'var(--acc)' }}>
                    {vol30.pct >= 0 ? '↗' : '↘'} {Math.abs(vol30.pct)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <RollIn value={vol30.curV >= 1000 ? vol30.curV / 1000 : vol30.curV} format={v => v >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString()} />
                <span className="muted small" style={{ fontWeight: 700 }}>{vol30.curV >= 1000 ? (S.unit === 'lb' ? 'k lb' : 't') : S.unit}</span>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <Sparkline values={vol30.spark} color="var(--acc)" />
            </div>
          </div>

          <div className="card tappable" style={{ margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} {...tappable(() => bwSheet())}>
            <div>
              <div className="gm-micro" style={{ fontSize: 10, marginBottom: 8 }}>{t('WEIGHT')}</div>
              <div style={{ fontSize: 26, fontWeight: 900, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {latestBw ? (
                  <>
                    <RollIn value={latestBw.w} format={v => (Math.round(v * 10) / 10).toString()} />
                    <span className="muted small" style={{ fontWeight: 700 }}>{S.unit}</span>
                  </>
                ) : '—'}
              </div>
              <div className="dim small" style={{ marginTop: 2 }}>
                {latestBw ? fmtDate(latestBw.d) : t('Tap to add weight')}
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <Sparkline values={bwSeries} color="var(--gm-sage)" />
            </div>
          </div>
        </div>
      </Rise>

      {/* Consistency Heatmap with GymMane 4-Color Heat-Tone Picker */}
      <Rise index={1}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row between" style={{ marginBottom: 10, gap: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="gm-micro">{t('CONSISTENCY')}</span>
              {streakDays > 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--acc)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="flame" style={{ fontSize: 12 }} /> {streakDays}d
                </span>
              )}
            </div>
            <div className="gm-tone-dots" role="radiogroup" aria-label={t('Heat color')}>
              {HEAT_TONES.map(tn => (
                <button
                  key={tn.id}
                  type="button"
                  role="radio"
                  aria-checked={heatTone === tn.id}
                  aria-label={tn.id}
                  className={'gm-tone-btn' + (heatTone === tn.id ? ' on' : '')}
                  onClick={() => update(s => { s.heatTone = tn.id })}
                >
                  {tn.dots.map((c, idx) => <span key={idx} className="gm-tone-swatch" style={{ background: c }} />)}
                </button>
              ))}
            </div>
          </div>
          <Heatmap
            S={S}
            onDay={iso => {
              const wsList = workouts.filter(w => w.d === iso)
              if (wsList.length === 1) workoutDetailSheet(wsList[0])
              else if (wsList.length) calendarSheet(iso)
            }}
          />
        </div>
      </Rise>

      {/* 2x2 All-Time Totals */}
      <Rise index={2}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="card" style={{ margin: 0, padding: '14px 16px' }}>
            <div className="gm-micro" style={{ fontSize: 10 }}>{t('SESSIONS')}</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}><RollIn value={workouts.length} /></div>
          </div>
          <div className="card" style={{ margin: 0, padding: '14px 16px' }}>
            <div className="gm-micro" style={{ fontSize: 10 }}>{t('SETS')}</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}><RollIn value={allTimeTotals.sets} /></div>
          </div>
          <div className="card" style={{ margin: 0, padding: '14px 16px' }}>
            <div className="gm-micro" style={{ fontSize: 10 }}>{t('TIME')}</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <RollIn value={allTimeTotals.hours >= 1 ? allTimeTotals.hours : allTimeTotals.mins} />
              <span className="muted small">{allTimeTotals.hours >= 1 ? 'h' : 'min'}</span>
            </div>
          </div>
          <div className="card" style={{ margin: 0, padding: '14px 16px' }}>
            <div className="gm-micro" style={{ fontSize: 10 }}>{t('LIFTED')}</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <RollIn value={allTimeTotals.vol >= 1000 ? allTimeTotals.vol / 1000 : allTimeTotals.vol} format={v => v >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString()} />
              <span className="muted small">{allTimeTotals.vol >= 1000 ? (S.unit === 'lb' ? 'k lb' : 't') : S.unit}</span>
            </div>
          </div>
        </div>
      </Rise>

      {/* Anatomical GymMane Muscle Map Card */}
      {workouts.length > 0 && (
        <Rise index={3}>
          <MuscleBalance S={S} onExercise={id => setExId(id)} />
        </Rise>
      )}

      {/* Muscle Radar Card */}
      {workouts.length > 0 && (
        <Rise index={4}>
          <MuscleRadar days={30} />
        </Rise>
      )}

      {/* This Week 7-Day Set Bars */}
      <Rise index={5}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <span className="gm-micro">{t('THIS WEEK')}</span>
            <span className="dim small" style={{ fontWeight: 700 }}>
              {t('{0} sets', thisWeek.totalSets)} · {thisWeek.activeDays}/7
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', height: 84 }}>
            {thisWeek.days.map(d => {
              const barH = d.sets > 0 ? Math.max(12, Math.round((d.sets / thisWeek.peak) * 66)) : 6
              return (
                <div key={d.iso} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {d.sets > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: d.isToday ? 'var(--acc)' : 'var(--label-2)' }}>{d.sets}</span>}
                  <div style={{ width: '100%', maxWidth: 26, height: barH, borderRadius: 7, background: d.isToday ? 'var(--ember)' : d.sets > 0 ? 'var(--acc)' : 'var(--surface-2)', opacity: d.sets > 0 || d.isToday ? 1 : 0.6 }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 8 }}>
            {thisWeek.days.map(d => (
              <span key={d.iso} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: d.isToday ? 900 : 700, color: d.isToday ? 'var(--label)' : 'var(--label-3)' }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </Rise>

      {/* Strength Trends (Exercise Progress) */}
      <Rise index={6}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className="gm-micro">{t('STRENGTH TRENDS')}</span>
            {curEx && !onE1 && exBest > 0 && (
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--acc)' }}>
                {t('Best:')} {fmtNum(exBest)} {exUnit}
              </span>
            )}
            {curEx && onE1 && e1Best && (
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--acc)' }}>
                {t('Best:')} {fmtNum(e1Best.est)} {S.unit}
              </span>
            )}
          </div>
          {exHist.length ? (
            <>
              <div className="sect-b" style={{ marginBottom: 10 }}>
                <SelectRow title={t('Exercise')} sheetTitle={t('Strength trends')} value={curEx} onChange={setExId} stackedValue
                  options={exHist.map(id => ({
                    value: id,
                    label: nameOf(id) + (exCurrent[id].mx ? ' — ' + fmtNum(exCurrent[id].mx) + ' ' + exCurrent[id].unit : ''),
                  }))}
                  search={{
                    placeholder: t('Search…'),
                    label: t('Search…'),
                    emptyLabel: t('No match'),
                    match: (option, query) => matchExercise(matcherOf(option.value), query),
                  }}
                />
              </div>
              {showE1 && (
                <Segmented
                  className="seg-range"
                  value={onE1 ? 'e1rm' : 'top'}
                  onChange={setExMetric}
                  options={[{ value: 'top', label: t('Top set') }, { value: 'e1rm', label: t('Est. 1RM') }]}
                />
              )}
              <div className="chart">
                <LineChart points={onE1 ? e1ChartPts : topPts} h={150} unit={onE1 ? S.unit : exUnit} color="var(--acc)" />
              </div>
              <div style={{ marginTop: 8 }}>
                {exList.map((p, i) => (
                  <div key={i} className="row between small" style={{ padding: '6px 0', borderBottom: 'var(--hair) solid var(--sep)' }}>
                    <span className="muted">{fmtDate(p.d, true)}</span>
                    <span>{p.sets.map(s => setLabel(curEx, s, p.target)).join('  ')}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="muted small">{t('Finish your first workout to see strength curves here.')}</div>
          )}
        </div>
      </Rise>

      {/* Personal Records Card */}
      {topPRs.length > 0 && (
        <Rise index={7}>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <span className="gm-micro">{t('PERSONAL RECORDS')}</span>
              <span className="dim small">{topPRs.length} {t('best lifts')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPRs.map(pr => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => { const ex = exOr(pr.id); if (ex && !ex.missing) exerciseDetailSheet(ex) }}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '10px 12px', borderRadius: 14,
                    background: 'var(--surface-2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ color: 'var(--amber)', fontSize: 15, flex: 'none' }}><Icon name="trophy" /></span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.name}</div>
                      {pr.d && <div className="dim small">{fmtDate(pr.d, true)}</div>}
                    </div>
                  </div>
                  <b style={{ fontSize: 14.5, color: 'var(--acc)', flex: 'none', marginLeft: 10 }}>
                    {fmtNum(pr.w)} {S.unit}
                  </b>
                </button>
              ))}
            </div>
          </div>
        </Rise>
      )}

      {/* Timeline, Measures & Medals Cards */}
      <Rise index={8}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <button type="button" className="card tappable" style={{ margin: 0, padding: '14px 10px', textAlign: 'center' }} onClick={() => nav('/measures')}>
            <Icon name="ruler" style={{ color: 'var(--acc)', fontSize: 20, margin: '0 auto 6px' }} />
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>{t('Measures')}</div>
          </button>
          <button type="button" className="card tappable" style={{ margin: 0, padding: '14px 10px', textAlign: 'center' }} onClick={() => nav('/timeline')}>
            <Icon name="image" style={{ color: 'var(--gm-sage)', fontSize: 20, margin: '0 auto 6px' }} />
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>{t('Timeline')}</div>
          </button>
          <button type="button" className="card tappable" style={{ margin: 0, padding: '14px 10px', textAlign: 'center' }} onClick={() => nav('/awards')}>
            <Icon name="medal" style={{ color: 'var(--gm-warn)', fontSize: 20, margin: '0 auto 6px' }} />
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>{t('Medals')}</div>
          </button>
        </div>
      </Rise>
    </div>
  )
}
