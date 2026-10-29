import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { streakWeeks, lastBW } from '../lib/history.js'
import { fmtNum, todayISO, weekStartOf } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import ActivityHeatmap from '../components/ActivityHeatmap.jsx'
import { bwSheet } from '../sheets.jsx'
import { exOr } from '../lib/exercises.js'
import { musclesOf, MUSCLE_NAME } from '../lib/muscles.js'

export default function Profile() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)

  const workouts = S.workouts || []
  const totalSets = useMemo(() =>
    workouts.reduce((sum, w) => sum + (w.entries || []).reduce((s2, e) => s2 + (e.sets || []).filter(s => s.done).length, 0), 0),
    [workouts]
  )
  const totalVolume = useMemo(() =>
    workouts.reduce((sum, w) => sum + (w.entries || []).reduce((s2, e) =>
      s2 + (e.sets || []).filter(s => s.done).reduce((v, s) => v + ((s.w || 0) * (s.r || 0)), 0), 0), 0),
    [workouts]
  )
  const totalMinutes = useMemo(() =>
    workouts.reduce((sum, w) => {
      if (!w.start || !w.end) return sum
      return sum + Math.round((w.end - w.start) / 60000)
    }, 0),
    [workouts]
  )

  const bw = lastBW(S)
  const streak = streakWeeks(S)
  const ws = weekStartOf(S)

  // Member since (earliest workout date)
  const memberSince = useMemo(() => {
    const dates = workouts.map(w => w.d).filter(Boolean).sort()
    return dates.length ? dates[0] : todayISO()
  }, [workouts])

  // Workouts this month
  const thisMonth = todayISO().slice(0, 7)
  const monthW = workouts.filter(w => String(w.d || '').slice(0, 7) === thisMonth).length

  // Unique training days
  const uniqueDays = useMemo(() => new Set(workouts.map(w => w.d).filter(Boolean)).size, [workouts])

  // Unique exercises ever used
  const uniqueExercises = useMemo(() => new Set(workouts.flatMap(w => (w.entries || []).map(e => e.id))).size, [workouts])

  // Top muscle distribution
  const topMuscles = useMemo(() => {
    const counts = {}
    for (const w of workouts) {
      for (const e of w.entries || []) {
        const ex = exOr(e.id)
        if (!ex) continue
        const doneSets = (e.sets || []).filter(s => s.done).length
        if (!doneSets) continue
        const m = musclesOf(ex)
        for (const [slug, weight] of Object.entries(m)) {
          counts[slug] = (counts[slug] || 0) + weight * doneSets
        }
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([slug]) => MUSCLE_NAME[slug] || slug)
  }, [workouts])

  // Best week (most workouts in a 7-day window, timezone/DST-safe)
  const bestWeek = useMemo(() => {
    if (!workouts.length) return 0
    const dates = workouts.map(w => w.d).filter(Boolean).sort()
    let max = 0
    for (let i = 0; i < dates.length; i++) {
      const parts = dates[i].split('-').map(Number)
      if (parts.length !== 3) continue
      const startMs = Date.UTC(parts[0], parts[1] - 1, parts[2])
      const endISO = new Date(startMs + 7 * 86400000).toISOString().slice(0, 10)
      const count = dates.filter(d => d >= dates[i] && d < endISO).length
      if (count > max) max = count
    }
    return max
  }, [workouts])

  const trimmedName = user?.name ? user.name.trim() : ''
  const initials = trimmedName
    ? trimmedName.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '🏋️'
    : '🏋️'

  const volumeDisplay = useMemo(() => {
    if (totalVolume >= 10000) return `${fmtNum(Math.round(totalVolume / 1000))}k ${S.unit}`
    if (totalVolume >= 1000) return `${(totalVolume / 1000).toFixed(1)}k ${S.unit}`
    return `${fmtNum(totalVolume)} ${S.unit}`
  }, [totalVolume, S.unit])

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
        <Icon name="chevronLeft" />
      </button>
      <div style={{ flex: 1 }} />
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}>
        <Icon name="gear" />
      </button>
    </div>

    {/* Avatar & Name */}
    <div className="profile-hero">
      <div className="profile-avatar">{initials}</div>
      <h1 className="profile-name">{user?.name || 'Athlete'}</h1>
      <div className="profile-since dim small">
        {t('Training since {0}', memberSince)}
      </div>
    </div>

    {/* Key stats row */}
    <div className="profile-stats-row">
      <div className="profile-stat">
        <div className="profile-stat-v">{workouts.length}</div>
        <div className="profile-stat-l">{t('Workouts')}</div>
      </div>
      <div className="profile-stat">
        <div className="profile-stat-v">{streak}</div>
        <div className="profile-stat-l">{t('Week streak')}</div>
      </div>
      <div className="profile-stat">
        <div className="profile-stat-v">{uniqueDays}</div>
        <div className="profile-stat-l">{t('Days trained')}</div>
      </div>
    </div>

    {/* Lifetime Stats Card */}
    <div className="card">
      <h2>{t('Lifetime stats')}</h2>
      <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="tile">
          <div className="l"><Icon name="check" />{t('Total sets')}</div>
          <div className="v" style={{ fontSize: 22 }}>{fmtNum(totalSets)}</div>
        </div>
        <div className="tile">
          <div className="l"><Icon name="dumbbell" />{t('Volume lifted')}</div>
          <div className="v" style={{ fontSize: 22 }}>{volumeDisplay}</div>
        </div>
        <div className="tile">
          <div className="l"><Icon name="clock" />{t('Time training')}</div>
          <div className="v" style={{ fontSize: 22 }}>
            {totalMinutes >= 60 ? Math.round(totalMinutes / 60) + 'h' : totalMinutes + 'm'}
          </div>
        </div>
        <div className="tile">
          <div className="l"><Icon name="flame" />{t('Best week')}</div>
          <div className="v" style={{ fontSize: 22 }}>{bestWeek}</div>
        </div>
      </div>
    </div>

    {/* Muscle Distribution Chips */}
    {topMuscles.length > 0 && (
      <div className="card">
        <h2>{t('Top targeted muscles')}</h2>
        <div className="mchips" style={{ marginTop: 8 }}>
          {topMuscles.map(m => (
            <span key={m} className="hero-muscle-chip">
              {m}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Body Weight */}
    <div className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
        <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
      </div>
      <div className="profile-bw-current">
        {bw
          ? <><span className="big">{fmtNum(bw.w)}</span> <span className="dim">{S.unit}</span></>
          : <span className="dim small">{t('No entries yet')}</span>
        }
      </div>
    </div>

    {/* Activity Heatmap */}
    {workouts.length > 0 && (
      <div className="card">
        <h2>{t('Activity')}</h2>
        <ActivityHeatmap workouts={workouts} weekStart={ws} />
      </div>
    )}

    {/* Monthly Summary */}
    <div className="card">
      <h2>{t('This month')}</h2>
      <div className="row between">
        <span className="dim small">{t('Workouts')}</span>
        <span style={{ fontWeight: 600, fontSize: 20 }}>{monthW}</span>
      </div>
    </div>
  </div>
}
