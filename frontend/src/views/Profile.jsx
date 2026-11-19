import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { streakWeeks, lastBW } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, weekStartOf } from '../lib/format.js'
import { t, exerciseNameFor, dateLocale } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { Thumb } from '../components/Media.jsx'
import ActivityHeatmap from '../components/ActivityHeatmap.jsx'
import { bwSheet, confirmSheet, workoutDetailSheet, exerciseDetailSheet } from '../sheets.jsx'
import { exOr } from '../lib/exercises.js'
import { evaluateAchievements } from '../lib/achievements.js'
import AchievementsModal from '../components/AchievementsModal.jsx'
import EditProfileModal from '../components/EditProfileModal.jsx'
import SplitChooserModal from '../components/SplitChooserModal.jsx'
import { syncWorkoutPostToCloud, trackEvent } from '../lib/analytics.js'
import { useUI } from '../store/useUI.js'
import { logoutUser, resendVerificationEmail, refreshCurrentUser } from '../lib/firebase.js'

function compressWorkoutImage(file, maxDim = 760, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image'))
      img.onload = () => {
        let w = img.width || 600
        let h = img.height || 600
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim }
          else { w = Math.round((w * maxDim) / h); h = maxDim }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

function formatWorkoutFullDate(iso, startMs) {
  try {
    const d = startMs ? new Date(startMs) : new Date((iso || todayISO()) + 'T12:00:00')
    return d.toLocaleDateString(dateLocale(), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return iso || todayISO()
  }
}

function formatWorkoutDuration(startMs, endMs) {
  if (!startMs || !endMs || endMs <= startMs) return '45min'
  const totalMin = Math.max(1, Math.round((endMs - startMs) / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function inferWorkoutTitle(w) {
  if (w?.name && w.name.trim()) return w.name.trim()
  if (w?.routineName && w.routineName.trim()) return w.routineName.trim()
  const hr = w?.start ? new Date(w.start).getHours() : 18
  if (hr < 12) return 'Morning workout 💪'
  if (hr < 17) return 'Afternoon workout 💪'
  return 'Evening workout 🏋️'
}

export default function Profile() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const setGuest = useStore(s => s.setGuest)
  const update = useStore(s => s.update)
  const athlete = S.athleteProfile || {}

  const [showAchievements, setShowAchievements] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showSplitChooser, setShowSplitChooser] = useState(false)
  const [splitChooserCategory, setSplitChooserCategory] = useState('legend')
  const [verifyBusy, setVerifyBusy] = useState(false)

  // Chart state: 'duration' | 'volume' | 'reps'
  const [chartMetric, setChartMetric] = useState('duration')
  const [chartWeeksCount, setChartWeeksCount] = useState(12) // 12 = Last 3 months, 24 = Last 6 months, 52 = Last year
  const [expandedWorkouts, setExpandedWorkouts] = useState({})
  const [photoTargetWorkoutId, setPhotoTargetWorkoutId] = useState(null)
  const fileInputRef = useRef(null)
  const avatarFileRef = useRef(null)
  const avatarUrl = athlete.photoURL || user?.photoURL || ''

  const handleAvatarUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressWorkoutImage(file, 256, 0.85)
      update(s => {
        s.athleteProfile = { ...(s.athleteProfile || {}), photoURL: dataUrl }
      })
      if (user) {
        setUser({ ...user, photoURL: dataUrl })
      }
      useUI.getState().toast(t('Profile photo updated!'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to upload profile photo'))
    } finally {
      e.target.value = ''
    }
  }

  const handleClearWorkouts = () => {
    confirmSheet({
      title: t('Clear Workout History?'),
      message: t('This will remove all workouts from your profile feed and reset exercise records.'),
      confirmText: t('Clear All'),
      danger: true,
      onConfirm: () => {
        update(s => {
          s.workouts = []
          s.exWeights = {}
          s.workoutPosts = []
          s.workoutLikes = {}
        })
        useUI.getState().toast(t('Workout history cleared'))
      }
    })
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
      useUI.getState().toast(t('Verification email sent! Check your inbox.'))
    } catch (e) {
      useUI.getState().toast(e.message || t('Could not send verification email'))
    } finally {
      setVerifyBusy(false)
    }
  }

  const handleSignOut = () => {
    confirmSheet({
      title: t('Sign Out?'),
      message: t('Your workouts remain backed up to your account. You can sign back in anytime.'),
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
      return sum + Math.max(0, Math.round((w.end - w.start) / 60000))
    }, 0),
    [workouts]
  )

  const bw = lastBW(S)
  const streak = streakWeeks(S)
  const ws = weekStartOf(S)

  const memberSince = useMemo(() => {
    const dates = workouts.map(w => w.d).filter(Boolean).sort()
    return dates.length ? dates[0] : todayISO()
  }, [workouts])

  const uniqueDays = useMemo(() => new Set(workouts.map(w => w.d).filter(Boolean)).size, [workouts])

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
  const handleName = useMemo(() => {
    if (athlete.handle?.trim()) return athlete.handle.trim()
    if (user?.email) return user.email.split('@')[0]
    if (trimmedName) return trimmedName.toLowerCase().replace(/\s+/g, '')
    return 'athlete'
  }, [athlete.handle, user?.email, trimmedName])

  const initials = trimmedName
    ? trimmedName.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '🏋️'
    : '🏋️'

  const volumeDisplay = useMemo(() => {
    if (totalVolume >= 10000) return `${fmtNum(Math.round(totalVolume / 1000))}k ${S.unit}`
    if (totalVolume >= 1000) return `${(totalVolume / 1000).toFixed(1)}k ${S.unit}`
    return `${fmtNum(totalVolume)} ${S.unit}`
  }, [totalVolume, S.unit])

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

  // Profile completion percentage (for the "Your profile is 80% finished" banner)
  const completionPct = useMemo(() => {
    let score = 40
    if (trimmedName) score += 20
    if (bw?.w > 0) score += 20
    if (athlete.bio || athlete.height) score += 20
    return Math.min(100, score)
  }, [trimmedName, bw, athlete.bio, athlete.height])

  // Build weekly buckets for the Bar Chart (Duration / Volume / Reps)
  const weeklyChartData = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
    currentWeekStart.setHours(0, 0, 0, 0)

    const buckets = []
    for (let i = chartWeeksCount - 1; i >= 0; i--) {
      const start = new Date(currentWeekStart.getTime() - i * 7 * 86400000)
      const end = new Date(start.getTime() + 7 * 86400000)
      const startISO = start.toISOString().slice(0, 10)
      const endISO = end.toISOString().slice(0, 10)
      const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      let hours = 0
      let volume = 0
      let reps = 0
      for (const w of workouts) {
        if (!w.d || w.d < startISO || w.d >= endISO) continue
        const durMin = (w.start && w.end && w.end > w.start) ? (w.end - w.start) / 60000 : 45
        hours += durMin / 60
        for (const e of w.entries || []) {
          for (const s of e.sets || []) {
            if (!s.done) continue
            volume += (Number(s.w) || 0) * (Number(s.r) || 0)
            reps += Number(s.r) || 0
          }
        }
      }
      buckets.push({
        label,
        hours: Math.round(hours * 10) / 10,
        volume: Math.round(volume),
        reps
      })
    }
    return buckets
  }, [workouts, chartWeeksCount])

  const thisWeekBucket = weeklyChartData[weeklyChartData.length - 1] || { hours: 0, volume: 0, reps: 0 }
  const thisWeekHeadline = chartMetric === 'duration'
    ? `${fmtNum(thisWeekBucket.hours)} ${t('hours')}`
    : chartMetric === 'volume'
    ? `${fmtNum(thisWeekBucket.volume)} ${S.unit}`
    : `${fmtNum(thisWeekBucket.reps)} ${t('reps')}`

  const maxChartVal = useMemo(() => {
    const vals = weeklyChartData.map(b =>
      chartMetric === 'duration' ? b.hours : chartMetric === 'volume' ? b.volume : b.reps
    )
    const m = Math.max(...vals, 0)
    if (chartMetric === 'duration') return Math.max(3, Math.ceil(m))
    if (chartMetric === 'volume') return Math.max(5000, Math.ceil(m / 1000) * 1000)
    return Math.max(100, Math.ceil(m / 50) * 50)
  }, [weeklyChartData, chartMetric])

  // Sorted workouts newest first for the Hevy-style Workouts Feed
  const sortedWorkouts = useMemo(() =>
    workouts.slice().sort((a, b) => {
      const tB = b.start || (b.d ? new Date(b.d).getTime() : 0)
      const tA = a.start || (a.d ? new Date(a.d).getTime() : 0)
      return tB - tA
    }),
    [workouts]
  )

  const workoutPhotosMap = useMemo(() => {
    const map = {}
    for (const p of S.workoutPosts || []) {
      if (p.workoutId && p.photoDataUrl) map[p.workoutId] = p
    }
    return map
  }, [S.workoutPosts])

  const handleAttachPhotoClick = workoutId => {
    setPhotoTargetWorkoutId(workoutId)
    fileInputRef.current?.click()
  }

  const handlePhotoSelected = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressWorkoutImage(file)
      const targetId = photoTargetWorkoutId || sortedWorkouts[0]?.id || ('w_' + Date.now())
      const newPost = {
        id: 'post_' + Date.now().toString(36),
        workoutId: targetId,
        athleteName: user?.name || handleName,
        photoDataUrl: dataUrl,
        kudos: 1,
        createdAt: Date.now()
      }
      update(s => {
        s.workoutPosts = [newPost, ...(s.workoutPosts || []).filter(p => p.workoutId !== targetId)]
      })
      syncWorkoutPostToCloud(user, newPost).catch(() => {})
      trackEvent('workout_photo_attached', { workoutId: targetId })
      useUI.getState().toast(t('Workout photo added to your feed'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to attach photo'))
    } finally {
      e.target.value = ''
    }
  }

  const handleLikeWorkout = wId => {
    update(s => {
      s.workoutLikes = s.workoutLikes || {}
      s.workoutLikes[wId] = (s.workoutLikes[wId] || 0) + 1
    })
  }

  const achieveStats = useMemo(() => evaluateAchievements(S), [S])

  return (
    <div className="narrow" style={{ paddingBottom: 32 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoSelected}
      />
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarUpload}
      />

      {/* Top Header Bar: Handle on Left, Edit / Share / Settings on Right */}
      <div className="row between" style={{ padding: '6px 0 16px', alignItems: 'center' }}>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--label)' }}>
          {handleName}
        </div>
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowEditProfile(true)}
            aria-label={t('Edit Profile')}
            style={{ color: 'var(--label)', padding: 4, fontSize: 20, display: 'flex' }}
          >
            <Icon name="pencil" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `${trimmedName || handleName} on SmiTriX`, text: `${workouts.length} workouts logged on SmiTriX` }).catch(() => {})
              } else {
                useUI.getState().toast(t('Profile link copied'))
              }
            }}
            aria-label={t('Share Profile')}
            style={{ color: 'var(--label)', padding: 4, fontSize: 20, display: 'flex' }}
          >
            <Icon name="upload" />
          </button>
          <button
            type="button"
            onClick={() => nav('/settings')}
            aria-label={t('Settings')}
            style={{ color: 'var(--label)', padding: 4, fontSize: 20, display: 'flex' }}
          >
            <Icon name="gear" />
          </button>
        </div>
      </div>

      {/* Horizontal Profile Header Row (Avatar on Left, Name & Counts on Right) */}
      <div className="row" style={{ gap: 18, alignItems: 'center', marginBottom: 16 }}>
        <div
          style={{ position: 'relative', width: 76, height: 76, flexShrink: 0, cursor: 'pointer' }}
          onClick={() => avatarFileRef.current?.click()}
          title={t('Tap to upload profile photo')}
        >
          <div
            className="profile-avatar"
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: avatarUrl
                ? `url(${avatarUrl}) center/cover no-repeat`
                : 'var(--surface-2)',
              border: '2px solid var(--sep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 700,
              color: avatarUrl ? 'transparent' : 'var(--label)',
              margin: 0,
              boxShadow: 'none'
            }}
          >
            {initials}
          </div>
          <span
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--acc)',
              color: '#ffffff',
              border: '2px solid var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13
            }}
          >
            <Icon name="camera" />
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="profile-name" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px', color: 'var(--label)' }}>
            {trimmedName || 'Athlete'}
          </h1>
          <div className="profile-since dim small" style={{ fontSize: 11, marginBottom: 8 }}>
            {t('Training since {0}', memberSince)}
          </div>

          <div className="profile-stats-row" style={{ display: 'flex', gap: 22, margin: 0 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--label-2)' }}>{t('Workouts')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--label)', marginTop: 1 }}>{workouts.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--label-2)' }}>{t('Days trained')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--label)', marginTop: 1 }}>{uniqueDays}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--label-2)' }}>{t('Streak')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--label)', marginTop: 1 }}>{streak}w</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion / Status Banner */}
      {completionPct < 100 && (
        <button
          type="button"
          onClick={() => setShowEditProfile(true)}
          style={{
            width: '100%',
            background: '#172331',
            border: '1px solid rgba(29, 155, 240, 0.25)',
            borderRadius: 12,
            padding: '13px 16px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#e7e9ea',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <span>{t('Your profile is {0}% finished', completionPct)}</span>
          <Icon name="chevronRight" style={{ fontSize: 16, color: 'var(--acc)' }} />
        </button>
      )}

      {/* Email Verification Prompt if unverified */}
      {user?.email && !user.emailVerified && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--sep-op)',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <span className="small dim" style={{ fontSize: 12 }}>
            {user.email} · <span style={{ color: 'var(--orange)' }}>{t('Unverified')}</span>
          </span>
          <button
            type="button"
            onClick={handleResendVerify}
            disabled={verifyBusy}
            style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 600 }}
          >
            {verifyBusy ? t('Checking...') : t('Verify Email')}
          </button>
        </div>
      )}

      {/* Weekly Activity Bar Chart Section (Duration / Volume / Reps) */}
      <div style={{ marginBottom: 22 }}>
        <div className="row between" style={{ marginBottom: 12, alignItems: 'baseline' }}>
          <div style={{ fontSize: 15, color: 'var(--label-2)' }}>
            <b style={{ color: 'var(--label)', fontWeight: 700 }}>{thisWeekHeadline}</b> {t('this week')}
          </div>
          <button
            type="button"
            onClick={() => setChartWeeksCount(c => (c === 12 ? 24 : c === 24 ? 52 : 12))}
            style={{ color: 'var(--acc)', fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>
              {chartWeeksCount === 12 ? t('Last 3 months') : chartWeeksCount === 24 ? t('Last 6 months') : t('Last year')}
            </span>
            <Icon name="chevronDown" style={{ fontSize: 13 }} />
          </button>
        </div>

        {/* SVG Bar Chart with Horizontal Grid Lines */}
        <div style={{ width: '100%', height: 156, position: 'relative', marginBottom: 12 }}>
          <svg viewBox="0 0 360 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {[1, 0.66, 0.33, 0].map((ratio, idx) => {
              const y = 14 + (1 - ratio) * 110
              const val = Math.round(maxChartVal * ratio * 10) / 10
              const unitLbl = chartMetric === 'duration'
                ? (val === 0 ? '' : `${val} hrs`)
                : chartMetric === 'volume'
                ? (val === 0 ? '' : val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)
                : (val === 0 ? '' : `${val}`)
              return (
                <g key={idx}>
                  <line x1="36" y1={y} x2="354" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                  {unitLbl && (
                    <text x="0" y={y + 3} fill="var(--label-3)" fontSize="9.5">
                      {unitLbl}
                    </text>
                  )}
                </g>
              )
            })}

            {weeklyChartData.map((b, i) => {
              const count = weeklyChartData.length
              const plotW = 314
              const slotW = plotW / count
              const barW = Math.max(6, Math.min(18, slotW * 0.62))
              const x = 40 + i * slotW + (slotW - barW) / 2
              const rawVal = chartMetric === 'duration' ? b.hours : chartMetric === 'volume' ? b.volume : b.reps
              const h = maxChartVal > 0 ? Math.min(110, (rawVal / maxChartVal) * 110) : 0
              const y = 124 - h
              const showLabel = i % Math.max(1, Math.floor(count / 6)) === 0 || i === count - 1
              return (
                <g key={i}>
                  {h > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(3, h)}
                      rx="2"
                      fill="var(--acc)"
                    />
                  )}
                  {showLabel && (
                    <text
                      x={x + barW / 2}
                      y="142"
                      fill="var(--label-3)"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {b.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Pill Selectors: Duration | Volume | Reps */}
        <div className="row" style={{ gap: 8 }}>
          {[
            { id: 'duration', label: t('Duration') },
            { id: 'volume', label: t('Volume') },
            { id: 'reps', label: t('Reps') }
          ].map(pill => {
            const active = chartMetric === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setChartMetric(pill.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? 'var(--acc)' : 'var(--surface)',
                  color: active ? '#ffffff' : 'var(--label-2)',
                  border: active ? 'none' : '1px solid var(--sep-op)',
                  cursor: 'pointer'
                }}
              >
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dashboard 2x2 Grid */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 14, color: 'var(--label-2)', marginBottom: 10, fontWeight: 500 }}>
          {t('Dashboard')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            onClick={() => nav('/stats')}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--label)',
              textAlign: 'left'
            }}
          >
            <Icon name="chartLine" style={{ fontSize: 19, color: 'var(--label-2)' }} />
            <span>{t('Statistics')}</span>
          </button>

          <button
            type="button"
            onClick={() => nav('/library')}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--label)',
              textAlign: 'left'
            }}
          >
            <Icon name="dumbbell" style={{ fontSize: 19, color: 'var(--label-2)' }} />
            <span>{t('Exercises')}</span>
          </button>

          <button
            type="button"
            onClick={() => bwSheet()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--label)',
              textAlign: 'left'
            }}
          >
            <Icon name="scale" style={{ fontSize: 19, color: 'var(--label-2)' }} />
            <span>{t('Measures')}</span>
          </button>

          <button
            type="button"
            onClick={() => nav('/history')}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--label)',
              textAlign: 'left'
            }}
          >
            <Icon name="calendar" style={{ fontSize: 19, color: 'var(--label-2)' }} />
            <span>{t('Calendar')}</span>
          </button>
        </div>

        {/* Sub-row: Splits, Achievements & Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => { setSplitChooserCategory('body-type'); setShowSplitChooser(true) }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 10,
              padding: '10px 10px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--label-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Icon name="list" style={{ fontSize: 14 }} />
            <span>{t('Splits')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAchievements(true)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 10,
              padding: '10px 10px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--label-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Icon name="medal" style={{ fontSize: 14 }} />
            <span>{achieveStats.unlockedCount} {t('Badges')}</span>
          </button>
          <button
            type="button"
            onClick={() => nav('/plans')}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 10,
              padding: '10px 10px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--acc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Icon name="crown" style={{ fontSize: 14 }} />
            <span>{S.tier === 'pro' ? 'Pro' : S.tier === 'free' ? t('Upgrade') : 'Legacy'}</span>
          </button>
        </div>
      </div>

      {/* Workouts Feed Section (Matching Screenshot 1) */}
      <div style={{ marginBottom: 22 }}>
        <div className="row between" style={{ marginBottom: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--label-2)', fontWeight: 500 }}>
            {t('Workouts')}
          </div>
          {sortedWorkouts.length > 0 && (
            <div className="row" style={{ gap: 14, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleAttachPhotoClick(sortedWorkouts[0]?.id)}
                style={{ color: 'var(--acc)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Icon name="camera" style={{ fontSize: 15 }} />
                <span>{t('Add Photo')}</span>
              </button>
              <button
                type="button"
                onClick={handleClearWorkouts}
                style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Icon name="trash" style={{ fontSize: 14 }} />
                <span>{t('Clear')}</span>
              </button>
            </div>
          )}
        </div>

        {sortedWorkouts.length === 0 ? (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--sep-op)',
              borderRadius: 12,
              padding: '28px 16px',
              textAlign: 'center'
            }}
          >
            <Icon name="dumbbell" style={{ fontSize: 28, color: 'var(--label-3)', margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t('No workouts logged yet')}</div>
            <div className="muted small" style={{ marginBottom: 14 }}>
              {t('Complete your first workout to see your session feed, sets, and records here.')}
            </div>
            <Button variant="primary" style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }} onClick={() => nav('/workout')}>
              {t('Start a Workout')}
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedWorkouts.map((w, idx) => {
              const wId = w.id || ('w_' + idx)
              const entries = (w.entries || []).filter(e => (e.sets || []).some(s => s.done))
              const wVol = entries.reduce(
                (sum, e) => sum + (e.sets || []).filter(s => s.done).reduce((v, s) => v + (Number(s.w) || 0) * (Number(s.r) || 0), 0),
                0
              )
              const prCount = entries.reduce(
                (sum, e) => sum + (e.sets || []).filter(s => s.done && (s.pr || (s.w > 0 && S.exWeights?.[e.id]?.w && s.w >= S.exWeights[e.id].w))).length,
                0
              )
              const isExpanded = !!expandedWorkouts[wId]
              const visibleEntries = isExpanded ? entries : entries.slice(0, 3)
              const extraCount = Math.max(0, entries.length - 3)
              const attachedPost = workoutPhotosMap[wId]
              const likesCount = S.workoutLikes?.[wId] || 0

              return (
                <div
                  key={wId}
                  style={{
                    background: 'var(--bg)',
                    borderTop: idx === 0 ? '1px solid var(--sep-op)' : 'none',
                    borderBottom: '6px solid var(--surface)',
                    padding: '14px 0 12px'
                  }}
                >
                  {/* Feed Card User Header */}
                  <div className="row between" style={{ marginBottom: 10 }}>
                    <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: avatarUrl
                            ? `url(${avatarUrl}) center/cover no-repeat`
                            : 'var(--surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: avatarUrl ? 'transparent' : 'var(--label)',
                          border: '1px solid var(--sep-op)'
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--label)' }}>{handleName}</div>
                        <div style={{ fontSize: 12, color: 'var(--label-3)' }}>{formatWorkoutFullDate(w.d, w.start)}</div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleAttachPhotoClick(wId)}
                        title={t('Attach workout photo')}
                        style={{ color: 'var(--label-3)', padding: 6 }}
                      >
                        <Icon name="camera" style={{ fontSize: 17 }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => workoutDetailSheet(w)}
                        aria-label={t('Workout details')}
                        style={{ color: 'var(--label-2)', padding: 6 }}
                      >
                        <Icon name="more" style={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </div>

                  {/* Workout Title */}
                  <div
                    onClick={() => workoutDetailSheet(w)}
                    style={{ fontSize: 17, fontWeight: 700, color: 'var(--label)', marginBottom: 10, cursor: 'pointer' }}
                  >
                    {inferWorkoutTitle(w)}
                  </div>

                  {/* Time | Volume | Records Row */}
                  <div className="row" style={{ gap: 28, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--sep-op)' }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--label-3)', marginBottom: 2 }}>{t('Time')}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--label)' }}>
                        {formatWorkoutDuration(w.start, w.end)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--label-3)', marginBottom: 2 }}>{t('Volume')}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--label)' }}>
                        {fmtNum(Math.round(wVol || w.vol || 0))} {S.unit}
                      </div>
                    </div>
                    {prCount > 0 && (
                      <div>
                        <div style={{ fontSize: 11.5, color: 'var(--label-3)', marginBottom: 2 }}>{t('Records')}</div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#ffd60a' }}>🥇</span> {prCount}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional Attached Workout Photo */}
                  {attachedPost?.photoDataUrl && (
                    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--sep-op)' }}>
                      <img
                        src={attachedPost.photoDataUrl}
                        alt="Workout"
                        style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}

                  {/* Exercises List with Circular Thumbnails */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {visibleEntries.map((entry, eIdx) => {
                      const ex = exOr(entry.id)
                      const doneCount = (entry.sets || []).filter(s => s.done).length
                      const exName = ex ? exerciseNameFor(ex) : entry.id
                      const eqSuffix = ex?.eq && ex.eq !== 'body weight' && !exName.toLowerCase().includes(ex.eq.toLowerCase())
                        ? ` (${ex.eq.charAt(0).toUpperCase() + ex.eq.slice(1)})`
                        : ''
                      return (
                        <div
                          key={entry.id + '_' + eIdx}
                          onClick={() => ex && exerciseDetailSheet(ex)}
                          className="row"
                          style={{ gap: 12, alignItems: 'center', cursor: 'pointer' }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              overflow: 'hidden',
                              background: '#ffffff',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {ex ? <Thumb ex={ex} /> : <Icon name="dumbbell" style={{ color: '#000' }} />}
                          </div>
                          <div style={{ fontSize: 15, color: 'var(--label)', fontWeight: 500, textTransform: 'capitalize' }}>
                            {doneCount} {doneCount === 1 ? t('set') : t('sets')} {exName}{eqSuffix}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* See X more exercises */}
                  {extraCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedWorkouts(prev => ({ ...prev, [wId]: !isExpanded }))}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '10px 0 4px',
                        fontSize: 13,
                        color: 'var(--label-3)',
                        cursor: 'pointer'
                      }}
                    >
                      {isExpanded ? t('Show fewer exercises') : t('See {0} more exercises', extraCount)}
                    </button>
                  )}

                  {/* Bottom Social Action Row: Like | Comment | Share */}
                  <div className="row" style={{ gap: 22, marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--sep-op)', color: 'var(--label-2)' }}>
                    <button
                      type="button"
                      onClick={() => handleLikeWorkout(wId)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: likesCount > 0 ? 'var(--acc)' : 'var(--label-2)', fontSize: 14 }}
                    >
                      <Icon name="heart" style={{ fontSize: 19 }} />
                      {likesCount > 0 && <span style={{ fontWeight: 600 }}>{likesCount}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => workoutDetailSheet(w)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--label-2)' }}
                    >
                      <Icon name="clipboard" style={{ fontSize: 18 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachPhotoClick(wId)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--label-2)' }}
                    >
                      <Icon name="upload" style={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent PRs Showcase */}
      {recentPRs.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>{t('Recent Personal Records (PRs)')}</h2>
            <Icon name="trophy" style={{ color: 'var(--yellow)', fontSize: 16 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentPRs.map(pr => (
              <div key={pr.id} className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--sep-op)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{pr.name}</div>
                  {pr.date ? <div className="dim small" style={{ fontSize: 11 }}>{fmtDate(pr.date)}</div> : null}
                </div>
                <span style={{ fontWeight: 700, color: 'var(--acc)', fontSize: 14 }}>
                  {fmtNum(pr.weight)} {S.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lifetime Stats Card */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>{t('Lifetime stats')}</h2>
        <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
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

      {/* Body Weight Card */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
          <Button size="sm" icon="plus" style={{ width: 'auto' }} onClick={() => bwSheet()}>{t('Log')}</Button>
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
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>{t('Activity')}</h2>
          <ActivityHeatmap workouts={workouts} weekStart={ws} />
        </div>
      )}

      {/* Account Bar (Android App Only — Website is Demo Only without Login/Signup) */}
      {(import.meta.env.VITE_MOBILE === '1' || user) && (
        <div className="card" style={{ marginBottom: 16 }}>
          {user ? (
            <div className="row between" style={{ alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email || user.name}
                </div>
                <div className="small dim">{t('Cloud Sync Active')}</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                style={{ width: 'auto', fontSize: 13, color: 'var(--red)' }}
                onClick={handleSignOut}
              >
                {t('Sign Out')}
              </Button>
            </div>
          ) : (
            <Button variant="primary" icon="person" onClick={() => nav('/login')}>
              {t('Sign In')}
            </Button>
          )}
        </div>
      )}

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
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, margin: 'auto' }}>
            <EditProfileModal close={() => setShowEditProfile(false)} />
          </div>
        </div>
      )}

      {showSplitChooser && (
        <div className="sheet-backdrop" onClick={() => setShowSplitChooser(false)} style={{ zIndex: 100 }}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, margin: 'auto', maxHeight: '88vh', overflowY: 'auto' }}>
            <SplitChooserModal initialCategory={splitChooserCategory} close={() => setShowSplitChooser(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
