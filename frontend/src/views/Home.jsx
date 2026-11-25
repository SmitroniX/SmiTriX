import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { effectiveRoutine, effectiveRoutineId, nextTrainingDay, setsDoneActive, workoutVolume } from '../lib/history.js'
import { fmtDate, todayISO, isoOf, weekKey, weekStartOf, weekDayOffset, DAYS, DAYN, exCount } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { musclesOf, MUSCLE_NAME } from '../lib/muscles.js'
import { t, dateLocale } from '../lib/i18n.js'
import { dayOverrideSheet, calendarSheet, startFlow, starterPlanSheet, menuSheet, confirmSheet, shareRoutineSheet } from '../sheets.jsx'
import { dayStreakWithOff } from '../lib/gymmane-awards.js'
import { sumDayMacros } from '../lib/gymmane-nutrition.js'
import { summarizeRecoveryWeek } from '../lib/gymmane-recovery.js'
import { nextRotationRoutine } from '../lib/gymmane-measures.js'
import { Rise, RollIn, RoutineFolder, HomeFolder, CollapsedHeader, MiniBody } from '../components/GymManeMotion.jsx'
import { openStartSheet } from '../components/StartSheet.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'

function formatElapsed(start) {
  if (!start) return '0:00'
  const sec = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}:${String(rm).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function ActiveDuration({ start }) {
  const [str, setStr] = useState(() => formatElapsed(start))
  useEffect(() => {
    setStr(formatElapsed(start))
    const iv = setInterval(() => setStr(formatElapsed(start)), 1000)
    return () => clearInterval(iv)
  }, [start])
  return <span>{str}</span>
}

function GoalRing({ done, target }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const frac = Math.min(1, done / Math.max(1, target))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4.5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={frac >= 1 ? 'var(--gm-sage)' : 'var(--acc)'}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform="rotate(-90 24 24)"
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--label-2)' }}>
        {done}/{target} {t('days')}
      </span>
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const update = useStore(s => s.update)

  const today = new Date()
  const todayIso = todayISO()
  const rotInfo = S.scheduleMode === 'rotation' ? nextRotationRoutine(S) : null
  const routine = (rotInfo && !rotInfo.isRest && rotInfo.routine) ? rotInfo.routine : effectiveRoutine(S, todayIso)
  const todayOvr = S.dayPlan && S.dayPlan[todayIso] !== undefined
  const isDayOffToday = (S.daysOff || []).includes(todayIso)
  const next = !S.active && !routine ? nextTrainingDay(S, todayIso) : null

  const ws = weekStartOf(S)
  const wkStart = new Date(today)
  wkStart.setDate(today.getDate() - weekDayOffset(today.getDay(), ws))
  const doneDays = new Set((S.workouts || []).map(w => w.d))
  const offDays = new Set(S.daysOff || [])
  const doneToday = (S.workouts || []).filter(w => w.d === todayIso).at(-1) || null

  const streakInfo = useMemo(() => dayStreakWithOff(S, todayIso), [S.workouts, S.daysOff, todayIso])
  const weekStats = useMemo(() => {
    const wk = weekKey(todayIso, ws)
    let vol = 0
    let sets = 0
    let prs = 0
    const daysSet = new Set()
    for (const w of S.workouts || []) {
      if (weekKey(w.d, ws) !== wk) continue
      daysSet.add(w.d)
      vol += workoutVolume(w)
      if (w.prs) prs += w.prs
      for (const e of w.entries || []) {
        for (const s of e.sets || []) if (s.done) sets++
      }
    }
    return { vol, sets, prs, days: daysSet.size }
  }, [S.workouts, ws, todayIso])

  const weeklyGoal = S.weeklyTarget || Math.max(1, Object.keys(S.week || {}).filter(k => S.week[k]).length || 4)
  const activeSetsDone = S.active ? setsDoneActive(S.active) : 0

  const targetMuscleSlugs = useMemo(() => {
    if (!routine?.ex?.length) return []
    const counts = {}
    for (const item of routine.ex) {
      const ex = exOr(item?.id || item)
      if (!ex) continue
      for (const [slug, weight] of Object.entries(musclesOf(ex))) {
        counts[slug] = (counts[slug] || 0) + weight
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([slug]) => slug)
  }, [routine])

  const targetMuscles = targetMuscleSlugs.map(slug => MUSCLE_NAME[slug] || slug)

  const totalSets = (routine?.ex || []).reduce((sum, e) => {
    return sum + (Array.isArray(e.sets) ? e.sets.length : (Number(e.sets) || 3))
  }, 0)
  const estMinutes = Math.max(15, Math.round(totalSets * 2.5))

  const activeMuscles = useMemo(() => {
    if (!S.active?.entries?.length) return []
    const counts = {}
    for (const item of S.active.entries) {
      const ex = exOr(item.id)
      if (!ex) continue
      for (const [slug, weight] of Object.entries(musclesOf(ex))) {
        counts[slug] = (counts[slug] || 0) + weight
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([slug]) => MUSCLE_NAME[slug] || slug)
  }, [S.active])

  const longDateLabel = today.toLocaleDateString(dateLocale(), { weekday: 'long', month: 'short', day: 'numeric' })

  const todayFoodTotals = useMemo(() => {
    const entries = S.nutrition?.entries?.[todayIso] || []
    return sumDayMacros(entries)
  }, [S.nutrition?.entries, todayIso])
  const nutritionDetail = todayFoodTotals.kcal > 0
    ? `${todayFoodTotals.kcal} kcal · ${Math.round(todayFoodTotals.protein)}g P`
    : t('Log meals, water & macros')

  const recoveryWeek = useMemo(() => summarizeRecoveryWeek(S, todayIso), [S.recovery?.entries, todayIso])
  const recoveryMin = Math.round((recoveryWeek.heat + recoveryWeek.cold + recoveryWeek.breath) / 60)
  const recoveryDetail = recoveryWeek.sessions > 0
    ? `${recoveryMin} min ${t('this week')}`
    : t('Sauna, cold & breathwork')

  const toggleDayOff = iso => {
    update(s => {
      s.daysOff = s.daysOff || []
      if (s.daysOff.includes(iso)) s.daysOff = s.daysOff.filter(d => d !== iso)
      else s.daysOff.push(iso)
    })
    useUI.getState().toast(offDays.has(iso) ? t('Day off removed') : t('Marked as rest day (streak protected)'), {
      icon: 'bed',
      accent: 'var(--gm-sage)',
    })
  }

  const onDayTap = iso => {
    menuSheet({
      title: fmtDate(iso, true),
      items: [
        { icon: 'calendar', label: t('Change scheduled routine'), onClick: () => dayOverrideSheet(iso) },
        { icon: 'bed', label: offDays.has(iso) ? t('Remove rest day') : t('Mark as rest day (keeps streak)'), onClick: () => toggleDayOff(iso) },
      ],
    })
  }

  const openRoutineFolderMenu = r => {
    menuSheet({
      title: r.name,
      subtitle: exCount((r.ex || []).length),
      items: [
        { icon: 'playFill', label: t('Start workout'), onClick: () => startFlow(r.id) },
        { icon: 'pencil', label: t('Edit routine'), onClick: () => nav('/plan/r/' + r.id) },
        { icon: 'share', label: t('Share routine'), onClick: () => shareRoutineSheet(r) },
        {
          icon: 'trash',
          label: t('Delete routine'),
          danger: true,
          onClick: () => confirmSheet({
            title: t('Delete {0}?', r.name),
            message: t('This removes the routine from your plan.'),
            confirmText: t('Delete'),
            danger: true,
            onConfirm: () => update(s => {
              s.routines = (s.routines || []).filter(x => x.id !== r.id)
            }),
          }),
        },
      ],
    })
  }

  const volDisplayVal = weekStats.vol >= 1000 ? weekStats.vol / 1000 : weekStats.vol
  const volDisplayUnit = weekStats.vol >= 1000 ? (S.unit === 'lb' ? 'k lb' : 't') : S.unit

  return (
    <div className="narrow">
      <CollapsedHeader title={longDateLabel} />

      {/* GymMane Top Bar: TODAY + Bold Date + Streak Pill (clean 01-home.png header) */}
      <Rise index={0}>
        <div className="hdr home-sticky-header" style={{ alignItems: 'center', marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <div className="gm-micro" style={{ marginBottom: 3 }}>
              {user?.name || S.athleteProfile?.name ? `${t('TODAY')} · ${user?.name || S.athleteProfile?.name}` : t('TODAY')}
            </div>
            <h1 style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.03em' }}>{longDateLabel}</h1>
          </div>
          <button
            type="button"
            onClick={() => nav('/stats')}
            aria-label={t('Streak')}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid color-mix(in srgb, var(--sep) 45%, transparent)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14.5,
              fontWeight: 800,
              flex: 'none',
            }}
          >
            <Icon name="flame" style={{ color: 'var(--acc)', fontSize: 15 }} />
            <span>{streakInfo.current}</span>
          </button>
        </div>
      </Rise>

      {/* Active Workout Resume Hero Card */}
      {S.active && (
        <Rise index={1}>
          <div
            className="gm-hero-card active-workout-hero tappable"
            style={{ border: '1.5px solid var(--gm-sage)', cursor: 'pointer' }}
            {...tappable(() => nav('/workout'))}
          >
            <div className="gm-hero-orb-1" style={{ background: 'var(--gm-sage-soft)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 7, alignItems: 'center' }}>
                  <span className="live-workout-pulse" />
                  <span className="gm-micro" style={{ color: 'var(--gm-sage)' }}>
                    {t('In Progress')}
                  </span>
                </div>
                <span className="muted small" style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="clock" style={{ fontSize: 13 }} />
                  <ActiveDuration start={S.active.start} />
                </span>
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {S.active.name || t('Freestyle')}
              </h2>
              {activeMuscles.length > 0 && (
                <div className="row hero-muscle-chips" style={{ gap: 6, flexWrap: 'wrap', margin: '6px 0 10px' }}>
                  {activeMuscles.map(m => (
                    <span key={m} className="hero-muscle-chip">{t(m)}</span>
                  ))}
                </div>
              )}
              <div className="muted small" style={{ marginBottom: 16, fontWeight: 600 }}>
                {t(activeSetsDone === 1 ? '{0} completed set' : '{0} completed sets', activeSetsDone)}
              </div>
              <Button
                variant="primary"
                icon="playFill"
                style={{ width: '100%', minHeight: 50, fontSize: 16 }}
                onClick={e => { e.stopPropagation(); nav('/workout') }}
              >
                {t('Resume Workout')}
              </Button>
            </div>
          </div>
        </Rise>
      )}

      {/* Scheduled Routine Hero Card (GymMane signature runner card) */}
      {!S.active && routine && !doneToday && (
        <Rise index={1}>
          <div
            className="gm-hero-card home-hero-workout-card tappable"
            style={{ cursor: 'pointer' }}
            {...tappable(() => startFlow(routine.id))}
          >
            <div className="gm-hero-orb-1" />
            <div className="gm-hero-orb-2" />
            <img src="./smitrix-ui/img/runner.png" alt="" className="gm-hero-runner" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className="gm-micro">{t("TODAY'S ROUTINE")}</span>
                {todayOvr && <span className="tag" style={{ fontSize: 10.5 }}>{t('rescheduled')}</span>}
              </div>
              <h2 style={{ margin: '0 0 8px', paddingRight: 86, fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {routine.name}
              </h2>
              {targetMuscles.length > 0 && (
                <div className="row hero-muscle-chips" style={{ gap: 6, flexWrap: 'wrap', margin: '8px 0 10px', paddingRight: 72 }}>
                  <MiniBody muscles={targetMuscleSlugs} height={24} />
                  {targetMuscles.map(m => (
                    <span key={m} className="hero-muscle-chip">{t(m)}</span>
                  ))}
                </div>
              )}
              <div className="muted small row hero-meta-row" style={{ gap: 8, marginBottom: 18, fontWeight: 600 }}>
                <span>~{estMinutes} {t('min')}</span>
                <span>·</span>
                <span>{exCount(routine.ex?.length || 0)}</span>
                <span>·</span>
                <span>{totalSets} {t('sets')}</span>
              </div>
              <Button
                variant="primary"
                icon="playFill"
                className="hero-start-cta"
                style={{ width: '100%', minHeight: 50, fontSize: 16 }}
                onClick={e => { e.stopPropagation(); startFlow(routine.id) }}
              >
                {t('Start Workout')}
              </Button>
            </div>
          </div>
        </Rise>
      )}

      {/* Done for today Hero Card (01-home.png exact state) */}
      {!S.active && doneToday && (
        <Rise index={1}>
          <div className="gm-hero-card">
            <div className="gm-hero-orb-1" />
            <div className="gm-hero-orb-2" />
            <img src="./smitrix-ui/img/runner.png" alt="" className="gm-hero-runner" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="row" style={{ gap: 7, marginBottom: 8 }}>
                <span style={{ width: 17, height: 17, borderRadius: '50%', background: 'var(--ember)', color: 'var(--on-ember)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                  <Icon name="check" />
                </span>
                <span className="gm-micro">{t("TODAY'S ROUTINE")}</span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em' }}>
                {doneToday.name || routine?.name || t('Workout')}
              </h2>
              <div className="row" style={{ gap: 10, marginBottom: 18 }}>
                <MiniBody muscles={targetMuscleSlugs} height={26} />
                <span className="muted small" style={{ fontWeight: 600 }}>
                  {t('Done for today · nice work')}
                </span>
              </div>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--surface-2)', minHeight: 48, fontSize: 15 }}
                onClick={() => openStartSheet()}
              >
                <Icon name="playFill" style={{ fontSize: 13 }} />
                <span>{t('Train again')}</span>
              </button>
            </div>
          </div>
        </Rise>
      )}

      {/* Rest Day / Body Map Quick Focus Hero Card */}
      {!S.active && !routine && !doneToday && (
        <Rise index={1}>
          <div className="gm-hero-card">
            <div className="gm-hero-orb-1" />
            <div className="gm-hero-orb-2" />
            <img src="./smitrix-ui/img/runner.png" alt="" className="gm-hero-runner" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="row" style={{ gap: 7, marginBottom: 8 }}>
                {isDayOffToday && <Icon name="bed" style={{ color: 'var(--gm-sage)', fontSize: 15 }} />}
                <span className="gm-micro">{isDayOffToday ? t('REST DAY') : t("TODAY'S FOCUS")}</span>
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 25, fontWeight: 900, letterSpacing: '-0.03em', paddingRight: 76 }}>
                {isDayOffToday ? t('Recover & grow') : t('Tap muscles to train')}
              </h2>
              <div className="muted small" style={{ marginBottom: 16, fontWeight: 600, paddingRight: 64 }}>
                {next
                  ? t('Next session: {0}, {1}', t(DAYN[next.weekday]), next.routine.name)
                  : t('Pick muscles on the body map or launch a routine')}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Button variant="primary" icon="target" style={{ flex: 1, minHeight: 48 }} onClick={() => nav('/train')}>
                  {t('Body Map')}
                </Button>
                <Button style={{ flex: 1, minHeight: 48, background: 'var(--surface-2)' }} onClick={() => openStartSheet()}>
                  {t('Quick Start')}
                </Button>
              </div>
            </div>
          </div>
        </Rise>
      )}

      {/* GymMane 7-Day Circle Strip */}
      <Rise index={2}>
        <div className="card" style={{ padding: '14px 12px' }}>
          <div className="gm-week-row">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(wkStart)
              d.setDate(wkStart.getDate() + i)
              const iso = isoOf(d)
              const eff = effectiveRoutineId(S, iso)
              const done = doneDays.has(iso)
              const isOff = offDays.has(iso) || (!eff && !done)
              const isToday = iso === todayIso
              return (
                <div
                  key={iso}
                  className={'gm-wday' + (done ? ' done' : isOff ? ' rest' : '') + (isToday ? ' today' : '')}
                  {...tappable(() => onDayTap(iso))}
                >
                  <span className="gm-wday-lbl">{t(DAYS[d.getDay()])[0]}</span>
                  <span className="gm-wday-circle">
                    {done ? <Icon name="check" style={{ fontSize: 15, '--icon-stroke': 2.6 }} />
                      : isOff ? <Icon name="bed" style={{ fontSize: 15 }} />
                      : <span style={{ fontSize: 12, fontWeight: 800 }}>{d.getDate()}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Rise>

      {/* This Week Summary Card */}
      <Rise index={3}>
        <div className="gm-heading-row" style={{ marginTop: 18 }}>
          <span className="gm-h-title">{t('This week')}</span>
          <button type="button" className="gm-see-all" onClick={() => nav('/stats')}>
            {t('Progress')}
          </button>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, flex: 1 }}>
            <div>
              <div className="gm-micro" style={{ fontSize: 10 }}>{t('VOLUME')}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <RollIn value={volDisplayVal} format={v => v >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString()} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--label-2)' }}>{volDisplayUnit}</span>
              </div>
            </div>
            <div>
              <div className="gm-micro" style={{ fontSize: 10 }}>{t('SETS')}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
                <RollIn value={weekStats.sets} />
              </div>
            </div>
            <div>
              <div className="gm-micro" style={{ fontSize: 10 }}>{t('PRS')}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
                <RollIn value={weekStats.prs} />
              </div>
            </div>
          </div>
          <GoalRing done={weekStats.days} target={weeklyGoal} />
        </div>
      </Rise>

      {/* Horizontal 3D RoutineFolder Carousel */}
      {(S.routines || []).length > 0 && (
        <Rise index={4}>
          <div className="gm-heading-row">
            <span className="gm-h-title">{t('Routines')}</span>
            <button type="button" className="gm-see-all" onClick={() => nav('/plan')}>
              {t('See all')}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {S.routines.map(r => (
              <div key={r.id} style={{ flex: '0 0 calc(50% - 6px)', minWidth: 164, maxWidth: 220 }}>
                <RoutineFolder
                  routine={r}
                  onOpen={() => nav('/plan/r/' + r.id)}
                  onStart={() => startFlow(r.id)}
                  onMenu={() => openRoutineFolderMenu(r)}
                />
              </div>
            ))}
          </div>
        </Rise>
      )}

      {/* 3D Peeking Home Folders Row 1: Routines, Tools, Journal */}
      <Rise index={5}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 }}>
          <HomeFolder
            title={t('Routines')}
            detail={`${(S.routines || []).length} ${t('plans')}`}
            kind="routines"
            onClick={() => nav('/plan')}
          />
          <HomeFolder
            title={t('Tools')}
            detail={`12 ${t('calculators')}`}
            kind="tools"
            onClick={() => nav('/tools')}
          />
          <HomeFolder
            title={t('Journal')}
            detail={`${(S.notes || []).length} ${t('notes')}`}
            kind="journal"
            onClick={() => nav('/journal')}
          />
        </div>
      </Rise>

      {/* 3D Peeking Home Folders Row 2: Nutrition & Recovery */}
      {(S.nutritionOn !== false || S.recoveryOn !== false) && (
        <Rise index={6}>
          <div style={{ display: 'grid', gridTemplateColumns: S.nutritionOn !== false && S.recoveryOn !== false ? '1fr 1fr' : '1fr', gap: 10, marginTop: 12, marginBottom: 14 }}>
            {S.nutritionOn !== false && (
              <HomeFolder
                title={t('Nutrition')}
                detail={nutritionDetail}
                kind="nutrition"
                badge="BETA"
                onClick={() => nav('/nutrition')}
              />
            )}
            {S.recoveryOn !== false && (
              <HomeFolder
                title={t('Recovery')}
                detail={recoveryDetail}
                kind="recovery"
                badge="BETA"
                onClick={() => nav('/recovery')}
              />
            )}
          </div>
        </Rise>
      )}

      {/* Starter Plan Card when user has no routines yet */}
      {!(S.routines || []).length && !S.active && (
        <Rise index={6}>
          <div className="card">
            <div className="row" style={{ gap: 10, marginBottom: 6 }}>
              <span className="lrow-i" style={{ background: 'var(--acc)', color: 'var(--on-acc)' }}><Icon name="sparkles" /></span>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{t('Welcome!')}</div>
            </div>
            <div className="muted small" style={{ marginBottom: 14 }}>{t('Set up your weekly routine to get going — or load a ready-made starter plan.')}</div>
            <Button variant="primary" icon="sparkles" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
            <div style={{ height: 8 }} />
            <Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
          </div>
        </Rise>
      )}
    </div>
  )
}
