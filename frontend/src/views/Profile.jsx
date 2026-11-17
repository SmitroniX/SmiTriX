import { useMemo, useState } from 'react'
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
import { evaluateAchievements } from '../lib/achievements.js'
import AchievementsModal from '../components/AchievementsModal.jsx'
import EditProfileModal from '../components/EditProfileModal.jsx'
import SplitChooserModal from '../components/SplitChooserModal.jsx'
import { useUI } from '../store/useUI.js'

export default function Profile() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const athlete = S.athleteProfile || {}

  const [showAchievements, setShowAchievements] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showSplitChooser, setShowSplitChooser] = useState(false)
  const [splitChooserCategory, setSplitChooserCategory] = useState('legend')

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

  // Biometrics: Height & BMI Calculation
  const heightCm = Number(athlete.height) || 178
  const currentWeightVal = bw?.w || null
  const bmi = useMemo(() => {
    if (!currentWeightVal || !heightCm) return null
    const weightKg = S.unit === 'lb' ? currentWeightVal * 0.453592 : currentWeightVal
    const hMeter = heightCm / 100
    return Math.round((weightKg / (hMeter * hMeter)) * 10) / 10
  }, [currentWeightVal, heightCm, S.unit])

  const bmiCategory = useMemo(() => {
    if (!bmi) return null
    if (bmi < 18.5) return { label: 'Underweight', color: 'var(--blue)' }
    if (bmi < 25) return { label: 'Normal / Athletic', color: 'var(--green)' }
    if (bmi < 30) return { label: 'Athletic Dense / Overweight', color: 'var(--orange)' }
    return { label: 'Heavy Mass', color: 'var(--purple)' }
  }, [bmi])

  // The Big 3 / Big 4 Compound Lifts
  const benchPr = Number(S.exWeights?.['0025']?.w) || 0
  const squatPr = Number(S.exWeights?.['0043']?.w) || 0
  const deadliftPr = Math.max(Number(S.exWeights?.['0085']?.w) || 0, Number(S.exWeights?.['0027']?.w) || 0)
  const ohpPr = Number(S.exWeights?.['0426']?.w) || 0
  const big3Total = benchPr + squatPr + deadliftPr

  // Achievements Score
  const achieveStats = useMemo(() => evaluateAchievements(S), [S])

  // Body Type Info
  const bodyTypeKey = athlete.bodyType || 'mesomorph'
  const bodyTypeMeta = {
    ectomorph: { label: 'Ectomorph', tag: 'Fast Metabolism · Hardgainer Mass Protocol', splitId: 'ectomorph-mass', icon: 'flame' },
    mesomorph: { label: 'Mesomorph', tag: 'Athletic Build · Power & Hypertrophy PHUL', splitId: 'mesomorph-phul', icon: 'bolt' },
    endomorph: { label: 'Endomorph', tag: 'High Density · Metabolic Conditioning', splitId: 'endomorph-shred', icon: 'shield' }
  }[bodyTypeKey] || { label: 'Mesomorph', tag: 'Athletic Build · Power & Hypertrophy PHUL', splitId: 'mesomorph-phul', icon: 'bolt' }

  return <div className="narrow">
    {/* Navigation Header */}
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
        <Icon name="chevronLeft" />
      </button>
      <div style={{ flex: 1 }} />
      <div className="row" style={{ gap: 8 }}>
        <button className="iconbtn" onClick={() => setShowEditProfile(true)} aria-label={t('Edit Profile')} title={t('Edit Profile')}>
          <Icon name="pencil" />
        </button>
        <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}>
          <Icon name="gear" />
        </button>
      </div>
    </div>

    {/* Athlete Hero Profile Card */}
    <div
      className="profile-hero card"
      style={{
        background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%)',
        borderRadius: 20,
        padding: '24px 20px',
        marginBottom: 16,
        border: '1px solid var(--sep)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'linear-gradient(90deg, var(--acc), #40c8e0, #ffd60a)'
        }}
      />

      <div
        className="profile-avatar"
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          background: 'linear-gradient(135deg, var(--surface-3) 0%, var(--surface-2) 100%)',
          border: '2.5px solid var(--acc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--acc)',
          margin: '0 auto 12px',
          boxShadow: '0 4px 20px color-mix(in srgb, var(--acc) 25%, transparent)'
        }}
      >
        {initials}
      </div>

      <h1 className="profile-name" style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
        {user?.name || 'Athlete'}
      </h1>

      <div className="row" style={{ justifyContent: 'center', gap: 6, marginBottom: 8 }}>
        <span className="tag acc" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
          {athlete.goal ? t(athlete.goal) : t('Hypertrophy Athlete')}
        </span>
        <span className="tag dim" style={{ fontSize: 11 }}>
          Level {Math.max(1, Math.floor(workouts.length / 5) + 1)}
        </span>
      </div>

      {athlete.bio ? (
        <div style={{ fontSize: 13, color: 'var(--label-2)', fontStyle: 'italic', marginBottom: 8 }}>
          “{athlete.bio}”
        </div>
      ) : null}

      <div className="profile-since dim small">
        {t('Training since {0}', memberSince)}
      </div>
    </div>

    {/* Key Stats Row (Workouts, Streak, Days trained) */}
    <div className="profile-stats-row tiles" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 16 }}>
      <div className="tile profile-stat" style={{ textAlign: 'center' }}>
        <div className="profile-stat-v v" style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>{workouts.length}</div>
        <div className="profile-stat-l l" style={{ fontSize: 12, justifyContent: 'center' }}>{t('Workouts')}</div>
      </div>
      <div className="tile profile-stat" style={{ textAlign: 'center' }}>
        <div className="profile-stat-v v" style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)' }}>🔥 {streak}</div>
        <div className="profile-stat-l l" style={{ fontSize: 12, justifyContent: 'center' }}>{t('Week streak')}</div>
      </div>
      <div className="tile profile-stat" style={{ textAlign: 'center' }}>
        <div className="profile-stat-v v" style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)' }}>{uniqueDays}</div>
        <div className="profile-stat-l l" style={{ fontSize: 12, justifyContent: 'center' }}>{t('Days trained')}</div>
      </div>
    </div>

    {/* Somatotype & Body Type Workout Banner */}
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.08) 0%, rgba(10, 132, 255, 0.05) 100%)',
        border: '1px solid rgba(48, 209, 88, 0.25)',
        marginBottom: 16
      }}
    >
      <div className="row between" style={{ marginBottom: 6 }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Icon name="dna" style={{ color: 'var(--acc)', fontSize: 18 }} />
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('Body Type Profile')}</h2>
        </div>
        <button
          className="tag acc"
          onClick={() => setShowEditProfile(true)}
          style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
        >
          {bodyTypeMeta.label}
        </button>
      </div>

      <div style={{ fontSize: 13, color: 'var(--label-2)', marginBottom: 12, lineHeight: 1.4 }}>
        {bodyTypeMeta.tag}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Button
          size="sm"
          variant="tinted"
          icon="sparkles"
          style={{ flex: 1 }}
          onClick={() => {
            setSplitChooserCategory('body-type')
            setShowSplitChooser(true)
          }}
        >
          {t('Explore Body Type Splits')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon="trophy"
          style={{ flex: 1 }}
          onClick={() => {
            setSplitChooserCategory('legend')
            setShowSplitChooser(true)
          }}
        >
          {t('Golden Era Splits')}
        </Button>
      </div>
    </div>

    {/* Achievements & Hall of Fame Showcase Card */}
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(28, 28, 30, 0.6) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.2)',
        marginBottom: 16
      }}
    >
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Icon name="trophy" style={{ color: '#ffd700', fontSize: 18 }} />
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('Athletic Hall of Fame')}</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#ffd700' }}>
          {achieveStats.totalPoints} PTS
        </span>
      </div>

      <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
        <span className="small dim">{t('Milestones Unlocked: {0} / {1}', achieveStats.unlockedCount, achieveStats.totalCount)}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)' }}>{achieveStats.unlockedPct}%</span>
      </div>

      <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ height: '100%', width: `${achieveStats.unlockedPct}%`, background: 'linear-gradient(90deg, #ffd700, var(--acc))', borderRadius: 3 }} />
      </div>

      <Button
        variant="tinted"
        icon="trophy"
        onClick={() => setShowAchievements(true)}
      >
        {t('View All Achievements & Badges')}
      </Button>
    </div>

    {/* The Big 3 / Big 4 Strength Hall */}
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Icon name="barbell" style={{ color: 'var(--acc)', fontSize: 18 }} />
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('The Big 3 Strength Hall')}</h2>
        </div>
        <span className="tag dim" style={{ fontSize: 11, fontWeight: 700 }}>
          {big3Total > 0 ? `${fmtNum(Math.round(big3Total))} ${S.unit} Total` : t('Log Lifts')}
        </span>
      </div>

      <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div className="tile">
          <div className="l">{t('Bench Press')}</div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: benchPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {benchPr ? `${fmtNum(benchPr)} ${S.unit}` : '—'}
          </div>
        </div>
        <div className="tile">
          <div className="l">{t('Back Squat')}</div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: squatPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {squatPr ? `${fmtNum(squatPr)} ${S.unit}` : '—'}
          </div>
        </div>
        <div className="tile">
          <div className="l">{t('Deadlift')}</div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: deadliftPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {deadliftPr ? `${fmtNum(deadliftPr)} ${S.unit}` : '—'}
          </div>
        </div>
        <div className="tile">
          <div className="l">{t('Overhead Press')}</div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: ohpPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {ohpPr ? `${fmtNum(ohpPr)} ${S.unit}` : '—'}
          </div>
        </div>
      </div>

      <div className="small dim" style={{ fontSize: 11, textAlign: 'center', marginTop: 4 }}>
        {big3Total >= (S.unit === 'lb' ? 1000 : 453.5)
          ? '🏆 Certified 1,000 lb Club Member!'
          : t('Target: 1,000 lb Club ({0} {1} remaining)', fmtNum(Math.max(0, Math.round((S.unit === 'lb' ? 1000 : 453.5) - big3Total))), S.unit)}
      </div>
    </div>

    {/* Lifetime Stats Card */}
    <div className="card" style={{ marginBottom: 16 }}>
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

    {/* Body Weight & Biometrics */}
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
        <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
      </div>

      <div className="profile-bw-current" style={{ marginBottom: 10 }}>
        {bw
          ? <><span className="big">{fmtNum(bw.w)}</span> <span className="dim">{S.unit}</span></>
          : <span className="dim small">{t('No entries yet')}</span>
        }
      </div>

      {bmi && (
        <div className="row between" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--label-3)', textTransform: 'uppercase', fontWeight: 700 }}>{t('Body Mass Index (BMI)')}</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{bmi} <span style={{ fontSize: 12, color: bmiCategory?.color, fontWeight: 600 }}>· {bmiCategory?.label}</span></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--label-3)' }}>
            {heightCm} cm
          </div>
        </div>
      )}
    </div>

    {/* Top Muscles */}
    {topMuscles.length > 0 && (
      <div className="card" style={{ marginBottom: 16 }}>
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

    {/* Activity Heatmap */}
    {workouts.length > 0 && (
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>{t('Activity')}</h2>
        <ActivityHeatmap workouts={workouts} weekStart={ws} />
      </div>
    )}

    {/* Monthly Summary */}
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>{t('This month')}</h2>
      <div className="row between">
        <span className="dim small">{t('Workouts')}</span>
        <span style={{ fontWeight: 600, fontSize: 20 }}>{monthW}</span>
      </div>
    </div>

    {/* Modals */}
    {showAchievements && (
      <div className="sheet-backdrop" onClick={() => setShowAchievements(false)} style={{ zIndex: 100 }}>
        <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, margin: 'auto' }}>
          <AchievementsModal S={S} close={() => setShowAchievements(false)} />
        </div>
      </div>
    )}

    {showEditProfile && (
      <div className="sheet-backdrop" onClick={() => setShowEditProfile(false)} style={{ zIndex: 100 }}>
        <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, margin: 'auto' }}>
          <EditProfileModal close={() => setShowEditProfile(false)} />
        </div>
      </div>
    )}

    {showSplitChooser && (
      <div className="sheet-backdrop" onClick={() => setShowSplitChooser(false)} style={{ zIndex: 100 }}>
        <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, margin: 'auto' }}>
          <SplitChooserModal initialCategory={splitChooserCategory} close={() => setShowSplitChooser(false)} />
        </div>
      </div>
    )}
  </div>
}
