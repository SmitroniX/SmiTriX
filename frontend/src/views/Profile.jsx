import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { streakWeeks, lastBW } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, weekStartOf } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import ActivityHeatmap from '../components/ActivityHeatmap.jsx'
import { bwSheet, confirmSheet } from '../sheets.jsx'
import { exOr } from '../lib/exercises.js'
import { musclesOf, MUSCLE_NAME } from '../lib/muscles.js'
import { evaluateAchievements } from '../lib/achievements.js'
import AchievementsModal from '../components/AchievementsModal.jsx'
import EditProfileModal from '../components/EditProfileModal.jsx'
import SplitChooserModal from '../components/SplitChooserModal.jsx'
import WorkoutPhotoFeed from '../components/WorkoutPhotoFeed.jsx'
import { getExerciseRecommendations } from '../lib/recommendations.js'
import { submitUserFeedback, syncCustomerInsights } from '../lib/analytics.js'
import { useUI } from '../store/useUI.js'
import { logoutUser, resendVerificationEmail, refreshCurrentUser } from '../lib/firebase.js'

export default function Profile() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const setGuest = useStore(s => s.setGuest)
  const athlete = S.athleteProfile || {}

  const [showAchievements, setShowAchievements] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showSplitChooser, setShowSplitChooser] = useState(false)
  const [splitChooserCategory, setSplitChooserCategory] = useState('legend')
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackBusy, setFeedbackBusy] = useState(false)

  const recommendedExercises = useMemo(() => getExerciseRecommendations(S, { limit: 3 }), [S])

  const handleSendFeedback = async e => {
    e?.preventDefault?.()
    if (!feedbackMsg.trim()) {
      useUI.getState().toast(t('Enter your feedback or feature request'))
      return
    }
    setFeedbackBusy(true)
    try {
      await submitUserFeedback({ message: feedbackMsg.trim(), rating: feedbackRating, category: 'athlete_profile' })
      await syncCustomerInsights(user, S)
      setFeedbackMsg('')
      useUI.getState().toast(t('Thank you! Your feedback and telemetry were sent to the SmiTriX team.'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Saved feedback locally'))
      setFeedbackMsg('')
    } finally {
      setFeedbackBusy(false)
    }
  }

  const handleResendVerify = async () => {
    setVerifyBusy(true)
    try {
      const refreshed = await refreshCurrentUser()
      if (refreshed?.emailVerified) {
        setUser({ ...user, emailVerified: true, firebase: true })
        useUI.getState().toast(t('Email verified!'))
        return
      }
      await resendVerificationEmail()
      useUI.getState().toast(t('Verification email sent! Check your inbox and spam folder.'))
    } catch (e) {
      useUI.getState().toast(e.message || t('Could not send verification email'))
    } finally {
      setVerifyBusy(false)
    }
  }

  const handleSignOut = () => {
    confirmSheet({
      title: t('Sign Out?'),
      message: t('Your workouts remain saved on this device. You can sign back in anytime.'),
      confirmText: t('Sign Out'),
      danger: true,
      onConfirm: async () => {
        try { await logoutUser() } catch {}
        setUser(null)
        setGuest(false)
        useUI.getState().toast(t('Signed out'))
        nav('/login')
      }
    })
  }

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

  // Athlete XP & Level Progression System
  const athleteXP = useMemo(() => {
    const wXp = workouts.length * 100
    const sXp = totalSets * 10
    const vXp = Math.round(totalVolume / 100)
    const aXp = (achieveStats.totalPoints || 0) * 15
    return wXp + sXp + vXp + aXp
  }, [workouts.length, totalSets, totalVolume, achieveStats.totalPoints])

  const athleteLevel = Math.max(1, Math.floor(Math.sqrt(athleteXP / 50)) + 1)
  const currentLvlXP = Math.pow(athleteLevel - 1, 2) * 50
  const nextLvlXP = Math.pow(athleteLevel, 2) * 50
  const xpInLevel = Math.max(0, athleteXP - currentLvlXP)
  const xpNeeded = Math.max(1, nextLvlXP - currentLvlXP)
  const xpPct = Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeeded) * 100)))

  const rankTitle = useMemo(() => {
    if (athleteLevel >= 50) return t('Immortal Golden Era Legend')
    if (athleteLevel >= 35) return t('Titan of Strength')
    if (athleteLevel >= 20) return t('Master of Hypertrophy')
    if (athleteLevel >= 10) return t('Iron Vanguard')
    if (athleteLevel >= 5) return t('Athletic Practitioner')
    return t('Novice Iron Lifter')
  }, [athleteLevel])

  // Strength Standards Calculation relative to Bodyweight
  const bwVal = currentWeightVal || (S.unit === 'lb' ? 165 : 75)
  const toRatio = lift => (bwVal > 0 && lift > 0) ? Math.round((lift / bwVal) * 100) / 100 : 0
  const getStandardTag = (ratio, thresholds) => {
    if (!ratio) return { label: 'Unranked', color: 'var(--label-3)' }
    if (ratio >= thresholds.elite) return { label: 'Elite', color: '#bf5af2' }
    if (ratio >= thresholds.advanced) return { label: 'Advanced', color: '#ff9f0a' }
    if (ratio >= thresholds.intermediate) return { label: 'Intermediate', color: '#30d158' }
    return { label: 'Novice', color: '#0a84ff' }
  }

  const benchRatio = toRatio(benchPr)
  const squatRatio = toRatio(squatPr)
  const deadliftRatio = toRatio(deadliftPr)
  const ohpRatio = toRatio(ohpPr)

  const benchTier = getStandardTag(benchRatio, { intermediate: 0.9, advanced: 1.25, elite: 1.6 })
  const squatTier = getStandardTag(squatRatio, { intermediate: 1.2, advanced: 1.6, elite: 2.1 })
  const deadliftTier = getStandardTag(deadliftRatio, { intermediate: 1.4, advanced: 1.9, elite: 2.5 })
  const ohpTier = getStandardTag(ohpRatio, { intermediate: 0.6, advanced: 0.85, elite: 1.1 })

  // Body Type Info & Tailored Macro / Recovery Guidelines
  const bodyTypeKey = athlete.bodyType || 'mesomorph'
  const bodyTypeMeta = {
    ectomorph: {
      label: 'Ectomorph',
      tag: 'Fast Metabolism · Hardgainer Mass Protocol',
      splitId: 'ectomorph-mass',
      icon: 'flame',
      macro: '55% Carbs · 25% Protein · 20% Fats',
      caloric: '+400 kcal Surplus (Hypercaloric)',
      recovery: '48–72h between heavy compound days',
      focus: 'High tension, low volume, heavy compounds (3 days/wk)'
    },
    mesomorph: {
      label: 'Mesomorph',
      tag: 'Athletic Build · Power & Hypertrophy PHUL',
      splitId: 'mesomorph-phul',
      icon: 'bolt',
      macro: '40% Carbs · 30% Protein · 30% Fats',
      caloric: '+200 kcal Lean Surplus / Recomp',
      recovery: '48h per muscle group',
      focus: 'Heavy strength + hypertrophy isolation (4 days/wk)'
    },
    endomorph: {
      label: 'Endomorph',
      tag: 'High Density · Metabolic Conditioning',
      splitId: 'endomorph-shred',
      icon: 'shield',
      macro: '25% Carbs · 40% Protein · 35% Fats',
      caloric: '-300 kcal Deficit / Carb Cycling',
      recovery: 'Active recovery & high volume tolerance',
      focus: 'Short rest intervals, supersets & density (4 days/wk)'
    }
  }[bodyTypeKey] || {
    label: 'Mesomorph',
    tag: 'Athletic Build · Power & Hypertrophy PHUL',
    splitId: 'mesomorph-phul',
    icon: 'bolt',
    macro: '40% Carbs · 30% Protein · 30% Fats',
    caloric: '+200 kcal Lean Surplus / Recomp',
    recovery: '48h per muscle group',
    focus: 'Heavy strength + hypertrophy isolation (4 days/wk)'
  }

  // Recent PRs from exWeights
  const recentPRs = useMemo(() => {
    const list = []
    for (const [exId, record] of Object.entries(S.exWeights || {})) {
      if (record && record.w > 0) {
        const ex = exOr(exId)
        list.push({ id: exId, name: ex ? exerciseNameFor(ex) : exId, weight: record.w, date: record.d })
      }
    }
    return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 4)
  }, [S.exWeights])

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
          width: 84,
          height: 84,
          borderRadius: 42,
          background: 'linear-gradient(135deg, var(--surface-3) 0%, var(--surface-2) 100%)',
          border: '2.5px solid var(--acc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          fontWeight: 800,
          color: 'var(--acc)',
          margin: '0 auto 12px',
          boxShadow: '0 4px 20px color-mix(in srgb, var(--acc) 30%, transparent)'
        }}
      >
        {initials}
      </div>

      <h1 className="profile-name" style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
        {user?.name || 'Athlete'}
      </h1>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)', marginBottom: 6 }}>
        {rankTitle}
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 6, marginBottom: 12 }}>
        <span className="tag acc" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
          {athlete.goal ? t(athlete.goal) : t('Hypertrophy Athlete')}
        </span>
        <span className="tag dim" style={{ fontSize: 11, fontWeight: 700 }}>
          Level {athleteLevel}
        </span>
        <button
          onClick={() => nav('/plans')}
          className="tag"
          style={{
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            background: S.tier === 'free' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: S.tier === 'free' ? 'var(--blue)' : 'var(--amber)',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
          title={t('Manage subscription and features')}
        >
          {S.tier === 'free' ? `⚡ ${t('Free Plan')}` : `🏛️ ${t('Legacy Plan')}`}
        </button>
      </div>

      {/* XP Level Progress Bar */}
      <div style={{ maxWidth: 280, margin: '0 auto 12px' }}>
        <div className="row between" style={{ fontSize: 11, color: 'var(--label-3)', marginBottom: 4 }}>
          <span>{fmtNum(athleteXP)} XP</span>
          <span>{fmtNum(nextLvlXP)} XP (Level {athleteLevel + 1})</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, var(--acc), #40c8e0)', borderRadius: 3 }} />
        </div>
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

    {/* Account & Cloud Sync Status Card */}
    <div
      className="card"
      style={{
        background: user
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, var(--surface) 100%)'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, var(--surface) 100%)',
        border: user ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
        marginBottom: 16,
        padding: '16px 18px',
        borderRadius: 16
      }}
    >
      {user ? (
        <div>
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="row" style={{ gap: 10, alignItems: 'center', minWidth: 0 }}>
              <span
                className="lrow-i"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--acc)',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon name="cloud" />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email || user.name}
                </div>
                <div className="small dim" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>☁️ {t('Cloud Sync Active')}</span>
                  {user.emailVerified ? (
                    <span style={{ color: 'var(--acc)', fontWeight: 600 }}>· {t('Verified')}</span>
                  ) : user.email ? (
                    <span style={{ color: 'var(--orange)', fontWeight: 600 }}>· {t('Unverified')}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              style={{ fontSize: 12, color: 'var(--red)', flex: 'none' }}
              onClick={handleSignOut}
            >
              {t('Sign Out')}
            </Button>
          </div>
          {user.email && !user.emailVerified && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="small dim" style={{ fontSize: 12 }}>
                {t('Please verify your email address')}
              </span>
              <Button
                size="sm"
                variant="tinted"
                disabled={verifyBusy}
                onClick={handleResendVerify}
                style={{ fontSize: 12, flex: 'none' }}
              >
                {verifyBusy ? t('Checking...') : t('Verify / Resend')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <span
                className="lrow-i"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--blue)',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon name="personCircle" />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('Guest Mode (Local Storage)')}</div>
                <div className="small dim">{t('Data is stored only on this device')}</div>
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--label-2)'
              }}
            >
              {t('Offline')}
            </span>
          </div>
          <div className="small dim" style={{ marginBottom: 12, lineHeight: 1.4 }}>
            {t('Sign in with Google or Email to unlock cloud sync, multi-device backup, and your verified athlete profile.')}
          </div>
          <Button
            variant="primary"
            icon="person"
            style={{ width: '100%', fontSize: 14, fontWeight: 700 }}
            onClick={() => nav('/login')}
          >
            {t('Sign In / Create Account')}
          </Button>
        </div>
      )}
    </div>

    {/* Key Stats Row (Workouts, Streak, Days trained) */}
    <div className="profile-stats-row tiles" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 16 }}>
      <div className="tile profile-stat" style={{ textAlign: 'center' }}>
        <div className="profile-stat-v v" style={{ fontSize: 24, fontWeight: 800, color: 'var(--label)' }}>{workouts.length}</div>
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

      <div style={{ fontSize: 13, color: 'var(--label-2)', marginBottom: 10, lineHeight: 1.4 }}>
        {bodyTypeMeta.tag}
      </div>

      {/* Tailored Nutritional & Recovery Guidelines */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        <div className="row between">
          <span className="dim">{t('Nutrition Target:')}</span>
          <span style={{ fontWeight: 600, color: 'var(--label)' }}>{bodyTypeMeta.caloric}</span>
        </div>
        <div className="row between">
          <span className="dim">{t('Macros:')}</span>
          <span style={{ fontWeight: 600, color: 'var(--acc)' }}>{bodyTypeMeta.macro}</span>
        </div>
        <div className="row between">
          <span className="dim">{t('Recovery Window:')}</span>
          <span style={{ fontWeight: 600, color: 'var(--teal)' }}>{bodyTypeMeta.recovery}</span>
        </div>
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
          {t('Body Type Splits')}
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
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, var(--surface) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.25)',
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

    {/* The Big 3 / Big 4 Strength Hall & Relative Strength Standards */}
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Icon name="barbell" style={{ color: 'var(--acc)', fontSize: 18 }} />
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('Compound Strength Standards')}</h2>
        </div>
        <span className="tag dim" style={{ fontSize: 11, fontWeight: 700 }}>
          {big3Total > 0 ? `${fmtNum(Math.round(big3Total))} ${S.unit} Total` : t('Log Lifts')}
        </span>
      </div>

      <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div className="tile">
          <div className="row between">
            <span className="l">{t('Bench Press')}</span>
            {benchRatio > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: benchTier.color }}>{benchTier.label}</span>}
          </div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: benchPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {benchPr ? `${fmtNum(benchPr)} ${S.unit}` : '—'}
          </div>
          {benchRatio > 0 && <div className="small dim" style={{ fontSize: 11, marginTop: 2 }}>{benchRatio}× BW</div>}
        </div>
        <div className="tile">
          <div className="row between">
            <span className="l">{t('Back Squat')}</span>
            {squatRatio > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: squatTier.color }}>{squatTier.label}</span>}
          </div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: squatPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {squatPr ? `${fmtNum(squatPr)} ${S.unit}` : '—'}
          </div>
          {squatRatio > 0 && <div className="small dim" style={{ fontSize: 11, marginTop: 2 }}>{squatRatio}× BW</div>}
        </div>
        <div className="tile">
          <div className="row between">
            <span className="l">{t('Deadlift')}</span>
            {deadliftRatio > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: deadliftTier.color }}>{deadliftTier.label}</span>}
          </div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: deadliftPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {deadliftPr ? `${fmtNum(deadliftPr)} ${S.unit}` : '—'}
          </div>
          {deadliftRatio > 0 && <div className="small dim" style={{ fontSize: 11, marginTop: 2 }}>{deadliftRatio}× BW</div>}
        </div>
        <div className="tile">
          <div className="row between">
            <span className="l">{t('Overhead Press')}</span>
            {ohpRatio > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: ohpTier.color }}>{ohpTier.label}</span>}
          </div>
          <div className="v" style={{ fontSize: 18, fontWeight: 700, color: ohpPr ? 'var(--acc)' : 'var(--label-3)' }}>
            {ohpPr ? `${fmtNum(ohpPr)} ${S.unit}` : '—'}
          </div>
          {ohpRatio > 0 && <div className="small dim" style={{ fontSize: 11, marginTop: 2 }}>{ohpRatio}× BW</div>}
        </div>
      </div>

      <div className="small dim" style={{ fontSize: 11, textAlign: 'center', marginTop: 4 }}>
        {big3Total >= (S.unit === 'lb' ? 1000 : 453.5)
          ? '🏆 Certified 1,000 lb Club Member!'
          : t('Target: 1,000 lb Club ({0} {1} remaining)', fmtNum(Math.max(0, Math.round((S.unit === 'lb' ? 1000 : 453.5) - big3Total))), S.unit)}
      </div>
    </div>

    {/* Recent PRs Showcase */}
    {recentPRs.length > 0 && (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2>{t('Recent Personal Records (PRs)')}</h2>
          <Icon name="trophy" style={{ color: 'var(--yellow)', fontSize: 16 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recentPRs.map(pr => (
            <div key={pr.id} className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--sep-op)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{pr.name}</div>
                {pr.date ? <div className="dim small" style={{ fontSize: 11 }}>{fmtDate(pr.date)}</div> : null}
              </div>
              <span className="tag acc" style={{ fontWeight: 800 }}>
                {fmtNum(pr.weight)} {S.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

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
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>{t('This month')}</h2>
      <div className="row between">
        <span className="dim small">{t('Workouts')}</span>
        <span style={{ fontWeight: 600, fontSize: 20 }}>{monthW}</span>
      </div>
    </div>

    {/* Hevy-Style Workout Photo Posts & Social Activity Feed */}
    <WorkoutPhotoFeed />

    {/* Smart Exercise Recommendations Card */}
    {recommendedExercises.length > 0 && (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <Icon name="sparkles" style={{ color: 'var(--acc)', fontSize: 18 }} />
            <h2 style={{ margin: 0, fontSize: 16 }}>{t('Recommended Exercises For You')}</h2>
          </div>
          <Button size="sm" variant="ghost" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => nav('/library')}>
            {t('Explore All')} →
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recommendedExercises.map(rec => (
            <div
              key={rec.id}
              onClick={() => nav('/library')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--border-hairline)',
                cursor: 'pointer'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exerciseNameFor(rec.ex)}
                </div>
                <div className="dim small" style={{ fontSize: 11 }}>{rec.reason}</div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${rec.badgeColor} 15%, transparent)`,
                  color: rec.badgeColor,
                  flex: 'none'
                }}
              >
                {rec.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Customer Feedback & App Improvement Telemetry Card */}
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <Icon name="rocket" style={{ color: 'var(--blue)', fontSize: 18 }} />
        <div>
          <h2 style={{ margin: 0, fontSize: 15 }}>{t('Help Us Improve SmiTriX')}</h2>
          <div className="dim small" style={{ fontSize: 11 }}>{t('Request exercises, features, or report feedback directly to our cloud telemetry')}</div>
        </div>
      </div>
      <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row" style={{ gap: 6 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setFeedbackRating(star)}
              className="chip"
              style={{
                padding: '4px 10px',
                fontSize: 12,
                background: feedbackRating >= star ? 'rgba(255, 214, 10, 0.18)' : 'var(--surface-2)',
                color: feedbackRating >= star ? 'var(--yellow)' : 'var(--label-3)',
                border: feedbackRating >= star ? '1px solid var(--yellow)' : '1px solid transparent'
              }}
            >
              ★ {star}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            type="text"
            placeholder={t('What can we improve or add next?')}
            value={feedbackMsg}
            onChange={e => setFeedbackMsg(e.target.value)}
            style={{ flex: 1, fontSize: 13, padding: '10px 12px' }}
          />
          <Button variant="primary" type="submit" disabled={feedbackBusy} style={{ width: 'auto', padding: '10px 16px', fontSize: 13 }}>
            {feedbackBusy ? '...' : t('Send')}
          </Button>
        </div>
      </form>
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
