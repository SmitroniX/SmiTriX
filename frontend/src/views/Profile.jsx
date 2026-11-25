import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { streakWeeks, lastBW } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, weekStartOf } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import ActivityHeatmap from '../components/ActivityHeatmap.jsx'
import { bwSheet, confirmSheet, exerciseDetailSheet } from '../sheets.jsx'
import { exOr } from '../lib/exercises.js'
import EditProfileModal from '../components/EditProfileModal.jsx'
import BugReportModal from '../components/BugReportModal.jsx'
import { useUI } from '../store/useUI.js'
import { MOBILE } from '../lib/mobile.js'
import { logoutUser, resendVerificationEmail, refreshCurrentUser, isAdminEmail } from '../lib/firebase.js'
import { evaluateGymManeAwards } from '../lib/gymmane-awards.js'
import RecapModal from '../components/RecapModal.jsx'
import { Rise, RollIn } from '../components/GymManeMotion.jsx'

const BADGE_COLORS = {
  gold: '#E8B84B',
  blue: '#4A9EEB',
  green: '#54B979',
}

function compressProfileImage(file, maxDim = 960, quality = 0.82) {
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

function RecessedBox({ title, count, onMore, children }) {
  return (
    <div
      style={{
        padding: 6,
        borderRadius: 28,
        background: 'var(--surface)',
        border: '1px solid color-mix(in srgb, var(--label) 6%, transparent)',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          padding: '14px 14px 12px',
          borderRadius: 22,
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg) 82%, #000) 0%, color-mix(in srgb, var(--bg) 55%, var(--surface)) 100%)',
        }}
      >
        {children}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 10px 4px' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)' }}>{title}</span>
        {count != null && (
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label-3)', marginLeft: 7 }}>{count}</span>
        )}
        <span style={{ flex: 1 }} />
        {onMore && (
          <button type="button" className="gm-see-all" onClick={onMore}>
            {t('See all')}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const setGuest = useStore(s => s.setGuest)
  const update = useStore(s => s.update)
  const athlete = S.athleteProfile || {}

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)

  const avatarFileRef = useRef(null)
  const bannerFileRef = useRef(null)
  const momentFileRef = useRef(null)

  const isAdmin = Boolean(user?.admin || isAdminEmail(user?.email))
  const avatarUrl = athlete.photoURL || user?.photoURL || ''
  const bannerUrl = S.profileBanner || './smitrix-ui/img/banner_default.jpg'
  const badgeColor = BADGE_COLORS[S.profileBadge] || BADGE_COLORS.blue

  const workouts = S.workouts || []
  const moments = S.moments || []
  const gymCards = S.gymCards || []
  const bw = lastBW(S)
  const streak = streakWeeks(S)
  const ws = weekStartOf(S)

  const totalSets = useMemo(
    () => workouts.reduce((sum, w) => sum + (w.entries || []).reduce((s2, e) => s2 + (e.sets || []).filter(s => s.done).length, 0), 0),
    [workouts]
  )
  const totalVolume = useMemo(
    () => workouts.reduce((sum, w) => sum + (w.entries || []).reduce((s2, e) => s2 + (e.sets || []).filter(s => s.done).reduce((v, s) => v + ((s.w || 0) * (s.r || 0)), 0), 0), 0),
    [workouts]
  )
  const totalMinutes = useMemo(
    () => workouts.reduce((sum, w) => (w.start && w.end && w.end > w.start ? sum + Math.max(0, Math.round((w.end - w.start) / 60000)) : sum), 0),
    [workouts]
  )

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

  const trimmedName = (user?.name || athlete.name || '').trim()
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

  const timeDisplay = useMemo(() => {
    if (totalMinutes >= 60) {
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      return m ? `${h}h ${m}m` : `${h}h`
    }
    return `${totalMinutes}m`
  }, [totalMinutes])

  const gmAwards = useMemo(() => evaluateGymManeAwards(S), [S])

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

  // 12-month Jan-Dec breakdown for current year (matching GymMane _year)
  const yearSummary = useMemo(() => {
    const now = new Date()
    const yr = now.getFullYear()
    const curMonth = now.getMonth()
    const months = Array.from({ length: 12 }, (_, idx) => {
      const prefix = `${yr}-${String(idx + 1).padStart(2, '0')}`
      const d = new Date(yr, idx, 1)
      let count = 0
      let vol = 0
      for (const w of workouts) {
        if (!String(w.d || '').startsWith(prefix)) continue
        count++
        for (const e of w.entries || []) {
          for (const st of e.sets || []) if (st.done) vol += (st.w || 0) * (st.r || 0)
        }
      }
      return {
        idx,
        key: prefix,
        letter: d.toLocaleDateString('en-US', { month: 'short' }).slice(0, 1),
        fullName: d.toLocaleDateString('en-US', { month: 'long' }),
        count,
        vol,
        isCurrent: idx === curMonth,
      }
    })
    const sessionsYear = months.reduce((a, m) => a + m.count, 0)
    const volYear = months.reduce((a, m) => a + m.vol, 0)
    const activeMonths = months.filter(m => m.count > 0).length
    const bestMonth = months.slice().sort((a, b) => b.count - a.count)[0]
    const peak = Math.max(1, ...months.map(m => m.count))
    return { months, sessionsYear, volYear, activeMonths, bestMonth: bestMonth?.count > 0 ? bestMonth : null, peak }
  }, [workouts])

  const handleBannerUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressProfileImage(file, 960, 0.82)
      update(s => { s.profileBanner = dataUrl })
      useUI.getState().toast(t('Cover banner updated'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to upload banner'))
    } finally {
      e.target.value = ''
    }
  }

  const handleAvatarUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressProfileImage(file, 256, 0.85)
      update(s => { s.athleteProfile = { ...(s.athleteProfile || {}), photoURL: dataUrl } })
      if (user) setUser({ ...user, photoURL: dataUrl })
      useUI.getState().toast(t('Profile photo updated!'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to upload profile photo'))
    } finally {
      e.target.value = ''
    }
  }

  const handleMomentUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressProfileImage(file, 720, 0.82)
      update(s => {
        s.moments = [{ id: 'm_' + Date.now().toString(36), d: todayISO(), photo: dataUrl }, ...(s.moments || [])].slice(0, 24)
      })
      useUI.getState().toast(t('Photo moment added'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to add photo'))
    } finally {
      e.target.value = ''
    }
  }

  const cycleBadge = () => {
    const order = ['blue', 'gold', 'green']
    const next = order[(order.indexOf(S.profileBadge || 'blue') + 1) % order.length]
    update(s => { s.profileBadge = next })
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
        setGuest(!MOBILE)
        useUI.getState().toast(t('Signed out'))
        nav(MOBILE ? '/login' : '/home')
      },
    })
  }

  const PHOTO_TURNS = [-3.4, 2.6, -1.7, 3.1]

  return (
    <div className="narrow" style={{ paddingBottom: 32 }}>
      <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
      <input ref={bannerFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
      <input ref={momentFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMomentUpload} />

      {/* GymMane Full Cover Banner + Top-Right Gear + Overlapping Avatar + Edit Pill */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <div
          onClick={() => bannerFileRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label={t('Change cover banner')}
          style={{
            position: 'relative',
            height: 164,
            borderRadius: 26,
            overflow: 'hidden',
            background: `url(${bannerUrl}) center/cover no-repeat var(--surface)`,
            cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 35%, color-mix(in srgb, var(--bg) 55%, transparent) 78%, var(--bg) 100%)',
          }} />

          {/* Top bar over banner: Month Recap pill (left) & Floating Gear button (right) */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setShowRecap(true) }}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 999,
                background: 'rgba(10,10,10,0.48)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Icon name="sparkles" style={{ fontSize: 12, color: 'var(--acc)' }} />
              <span>{t('Month Recap')}</span>
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); nav('/admin') }}
                  aria-label={t('Admin Dashboard')}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.44)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="shield" />
                </button>
              )}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); nav('/settings') }}
                aria-label={t('Settings')}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.44)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                <Icon name="gear" />
              </button>
            </div>
          </div>
        </div>

        {/* Overlapping Avatar (left) & Edit Profile Pill (right) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 6px', marginTop: -44, position: 'relative', zIndex: 3 }}>
          <div
            onClick={() => avatarFileRef.current?.click()}
            role="button"
            tabIndex={0}
            title={t('Tap to upload profile photo')}
            style={{ position: 'relative', width: 86, height: 86, cursor: 'pointer' }}
          >
            <div
              className="profile-avatar"
              style={{
                width: 86,
                height: 86,
                borderRadius: '50%',
                background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : 'var(--surface-2)',
                border: '3px solid var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 900,
                color: avatarUrl ? 'transparent' : 'var(--label)',
              }}
            >
              {initials}
            </div>
            <span style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--acc)',
              color: 'var(--on-acc)',
              border: '2.5px solid var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
            }}>
              <Icon name="camera" />
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowEditProfile(true)}
            style={{
              height: 30,
              padding: '0 12px',
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--label) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--label) 12%, transparent)',
              color: 'var(--label-2)',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              marginBottom: 4,
            }}
          >
            <Icon name="pencil" style={{ fontSize: 12 }} />
            <span>{t('Edit profile')}</span>
          </button>
        </div>

        {/* Name + Verified Badge + @handle */}
        <div style={{ padding: '12px 6px 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <h1 className="profile-name" style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.025em', color: 'var(--label)' }}>
              {trimmedName || 'Athlete'}
            </h1>
            <button
              type="button"
              onClick={cycleBadge}
              aria-label={t('Change verified badge color')}
              title={t('Tap to switch badge color')}
              style={{ color: badgeColor, fontSize: 18, display: 'inline-flex', padding: 2, cursor: 'pointer' }}
            >
              <Icon name="checkCircle" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label-2)' }}>@{handleName}</span>
            <span className="dim small">·</span>
            <span className="profile-since dim small">{t('Training since {0}', memberSince)}</span>
          </div>
        </div>
      </div>

      {/* Email Verification Notice (Native App Only) */}
      {MOBILE && user?.email && !user.emailVerified && (
        <div className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="small dim">{user.email} · <b style={{ color: 'var(--orange)' }}>{t('Unverified')}</b></span>
          <button type="button" onClick={handleResendVerify} disabled={verifyBusy} style={{ color: 'var(--acc)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
            {verifyBusy ? t('Checking...') : t('Verify Email')}
          </button>
        </div>
      )}

      {/* Horizontal Scrollable GymMane Stat Pills */}
      <Rise index={0}>
        <div
          className="profile-stats-row"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '2px 2px 16px',
            scrollbarWidth: 'none',
          }}
        >
          <div style={{ flex: 'none', height: 36, padding: '0 13px', borderRadius: 999, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
            <Icon name="dumbbell" style={{ fontSize: 14 }} />
            <b>{workouts.length}</b>
            <span className="muted">{t('Workouts')}</span>
          </div>
          <div style={{ flex: 'none', height: 36, padding: '0 13px', borderRadius: 999, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
            <Icon name="clock" style={{ fontSize: 14 }} />
            <b>{timeDisplay}</b>
          </div>
          <div style={{ flex: 'none', height: 36, padding: '0 13px', borderRadius: 999, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
            <Icon name="chartLine" style={{ fontSize: 14 }} />
            <b>{volumeDisplay}</b>
          </div>
          <button
            type="button"
            onClick={() => nav('/awards')}
            style={{ flex: 'none', height: 36, padding: '0 13px', borderRadius: 999, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--label)', cursor: 'pointer' }}
          >
            <Icon name="trophy" style={{ fontSize: 14, color: 'var(--acc)' }} />
            <b>Lv.{gmAwards.level}</b>
          </button>
          <button
            type="button"
            onClick={() => bwSheet()}
            style={{ flex: 'none', height: 36, padding: '0 13px', borderRadius: 999, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--label)', cursor: 'pointer' }}
          >
            <Icon name="scale" style={{ fontSize: 14 }} />
            <b>{bw ? `${fmtNum(bw.w)} ${S.unit}` : t('Log weight')}</b>
          </button>
          <div style={{ flex: 'none', height: 36, padding: '0 13px', borderRadius: 999, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
            <Icon name="flame" style={{ fontSize: 14, color: 'var(--acc)' }} />
            <b>{uniqueDays}</b>
            <span className="muted">{t('Days trained')}</span>
            {streak > 0 && <span className="dim small">· {streak}w</span>}
          </div>
        </div>
      </Rise>

      {/* GymMane Recessed-Tray Medals Box */}
      <Rise index={1}>
        <RecessedBox title={t('Medals')} count={gmAwards.earnedCount} onMore={() => nav('/awards')}>
          <div
            onClick={() => nav('/awards')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', minHeight: 74, cursor: 'pointer' }}
          >
            {gmAwards.awards.slice(0, 4).map(a => (
              <img
                key={a.id}
                src={a.earned ? `./smitrix-ui/badges/${a.id}.webp` : `./smitrix-ui/badges/${a.id}_off.webp`}
                alt={a.name}
                style={{ width: 58, height: 58, objectFit: 'contain', opacity: a.earned ? 1 : 0.42 }}
              />
            ))}
          </div>
        </RecessedBox>
      </Rise>

      {/* GymMane Tilted Overlapping PHOTOS Fan */}
      <Rise index={2}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', marginBottom: 14 }}>
            <span className="gm-micro">{t('PHOTOS')}</span>
            {moments.length > 0 && (
              <span className="gm-micro" style={{ marginLeft: 8, color: 'var(--label-2)' }}>{moments.length}</span>
            )}
            <span style={{ flex: 1 }} />
            {moments.length > 0 && (
              <button type="button" className="gm-see-all" onClick={() => nav('/timeline')}>
                {t('See all')}
              </button>
            )}
          </div>

          <div
            onClick={() => (moments.length > 0 ? nav('/timeline') : momentFileRef.current?.click())}
            role="button"
            tabIndex={0}
            style={{ position: 'relative', height: 156, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[0, 1, 2, 3].map(idx => {
                const m = moments[idx]
                return (
                  <div
                    key={idx}
                    style={{
                      width: 96,
                      height: 130,
                      marginLeft: idx === 0 ? 0 : -22,
                      marginTop: idx % 2 === 1 ? 10 : -2,
                      transform: `rotate(${PHOTO_TURNS[idx]}deg)`,
                      padding: 2.5,
                      borderRadius: 18,
                      background: 'var(--surface-2)',
                      boxShadow: '0 8px 18px rgba(0,0,0,0.38)',
                      opacity: m ? 1 : 0.48,
                    }}
                  >
                    {m ? (
                      <img src={m.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: 15.5, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', borderRadius: 15.5, background: 'var(--surface)' }} />
                    )}
                  </div>
                )
              })}
            </div>

            {moments.length === 0 && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); momentFileRef.current?.click() }}
                style={{
                  position: 'absolute',
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 999,
                  background: 'var(--ember)',
                  color: 'var(--on-ember)',
                  fontSize: 13.5,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.42)',
                  cursor: 'pointer',
                }}
              >
                <Icon name="camera" style={{ fontSize: 15 }} />
                <span>{t('Add photo')}</span>
              </button>
            )}
          </div>
        </div>
      </Rise>

      {/* GymMane Gym Pass Box */}
      {S.checkIn !== false && (
        <Rise index={3}>
          <RecessedBox title={t('Gym Pass')} count={gymCards.length > 0 ? gymCards.length : null} onMore={() => nav('/checkin')}>
            <div
              onClick={() => nav('/checkin')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 4px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'var(--acc-soft)',
                  color: 'var(--acc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}>
                  <Icon name="qr" />
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {gymCards[0]?.label || t('Add your gym membership pass')}
                  </div>
                  <div className="dim small">
                    {gymCards.length > 0
                      ? t('Tap to open full-brightness QR / barcode')
                      : t('Keep your turnstile QR or barcode ready offline')}
                  </div>
                </div>
              </div>
              <Icon name="chevronRight" style={{ color: 'var(--label-3)' }} />
            </div>
          </RecessedBox>
        </Rise>
      )}

      {/* GymMane History / 12-Month Consistency Box */}
      <Rise index={4}>
        <RecessedBox title={t('History')} count={workouts.length || null} onMore={() => nav('/history')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}><RollIn value={yearSummary.sessionsYear} /></div>
              <div className="gm-micro" style={{ fontSize: 9.5, marginTop: 3 }}>{t('WORKOUTS')}</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {yearSummary.volYear >= 1000 ? `${(yearSummary.volYear / 1000).toFixed(1)}k` : fmtNum(yearSummary.volYear)}
                <span className="dim small" style={{ marginLeft: 3 }}>{S.unit}</span>
              </div>
              <div className="gm-micro" style={{ fontSize: 9.5, marginTop: 3 }}>{t('LIFTED')}</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {yearSummary.activeMonths}<span className="dim small">/12</span>
              </div>
              <div className="gm-micro" style={{ fontSize: 9.5, marginTop: 3 }}>{t('MONTHS')}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 5, alignItems: 'end', height: 62 }}>
            {yearSummary.months.map(m => {
              const h = 6 + Math.round((m.count / yearSummary.peak) * 52)
              return (
                <div
                  key={m.key}
                  onClick={() => m.count > 0 && nav('/history')}
                  title={`${m.fullName}: ${m.count}`}
                  style={{
                    height: h,
                    borderRadius: 5,
                    background: m.isCurrent ? 'var(--ember)' : m.count > 0 ? 'var(--label-3)' : 'var(--surface-2)',
                    cursor: m.count > 0 ? 'pointer' : 'default',
                    transition: 'height 420ms var(--ease)',
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 5, marginTop: 7 }}>
            {yearSummary.months.map(m => (
              <span key={m.key} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: m.isCurrent ? 'var(--label)' : 'var(--label-3)' }}>
                {m.letter}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 14, fontSize: 12, color: 'var(--label-3)' }}>
            {yearSummary.bestMonth && (
              <span>{t('Best month')} · <b style={{ color: 'var(--label-2)' }}>{yearSummary.bestMonth.fullName}</b></span>
            )}
            <span>{t('Best week')} · <b style={{ color: 'var(--label-2)' }}>{bestWeek}</b></span>
          </div>
        </RecessedBox>
      </Rise>

      {/* Lifetime Totals & Body Weight Card */}
      <div className="card" style={{ padding: '16px 16px 14px' }}>
        <div className="gm-micro" style={{ marginBottom: 12 }}>{t('LIFETIME NUMBERS')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="tile" style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '12px 14px' }}>
            <div className="dim small">{t('Total sets')}</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{fmtNum(totalSets)}</div>
          </div>
          <div className="tile" style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '12px 14px' }}>
            <div className="dim small">{t('Volume lifted')}</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{volumeDisplay}</div>
          </div>
          <div className="tile" style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '12px 14px' }}>
            <div className="dim small">{t('Time training')}</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{timeDisplay}</div>
          </div>
          <div
            className="tile"
            onClick={() => bwSheet()}
            style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '12px 14px', cursor: 'pointer' }}
          >
            <div className="dim small">{t('Body weight')}</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>
              {bw ? `${fmtNum(bw.w)} ${S.unit}` : t('No entries yet')}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Heatmap Card */}
      <div className="card" style={{ padding: '16px' }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="gm-micro">{t('Activity')}</span>
          <span className="dim small" style={{ fontWeight: 700 }}>{t('Best week')}: {bestWeek}</span>
        </div>
        <ActivityHeatmap workouts={workouts} weekStart={ws} />
      </div>

      {/* Recent Personal Records */}
      {recentPRs.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <div className="gm-micro" style={{ marginBottom: 10 }}>{t('Recent Personal Records (PRs)')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentPRs.map(pr => (
              <div
                key={pr.id}
                onClick={() => { const ex = exOr(pr.id); if (ex) exerciseDetailSheet(ex) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{pr.name}</div>
                  {pr.date && <div className="dim small">{fmtDate(pr.date, true)}</div>}
                </div>
                <b style={{ fontSize: 14.5, color: 'var(--acc)', flex: 'none' }}>
                  {fmtNum(pr.weight)} {S.unit}
                </b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Native-app-only Account Sign Out / Bug Report footer */}
      {(MOBILE && user) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button
            type="button"
            className="btn ghost"
            style={{ flex: 1 }}
            onClick={() => setShowBugReport(true)}
          >
            {t('Report an Issue')}
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ flex: 1, color: 'var(--red)' }}
            onClick={handleSignOut}
          >
            {t('Sign Out')}
          </button>
        </div>
      )}

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      {showBugReport && <BugReportModal onClose={() => setShowBugReport(false)} />}
      {showRecap && <RecapModal onClose={() => setShowRecap(false)} />}
    </div>
  )
}
