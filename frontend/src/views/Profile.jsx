import { useEffect, useMemo, useRef, useState } from 'react'
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

const RECAP_AVATAR_SIZE = 118

const clamp01 = v => Math.max(0, Math.min(1, v))
const easeOutCubic = x => 1 - Math.pow(1 - clamp01(x), 3)
const easeInCubic = x => { const c = clamp01(x); return c * c * c }
const easeInOutSine = x => -(Math.cos(Math.PI * clamp01(x)) - 1) / 2

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
      className="gm-recessed-box"
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

// GymMane _GrabberPainter: horizontal capsule bar that bends into a downward chevron as you pull
function PullGrabber({ tVal }) {
  const half = 16 - 4 * tVal
  const lift = 5 * tVal
  const alpha = (0.24 + 0.44 * tVal).toFixed(3)
  return (
    <svg width="44" height="18" viewBox="0 0 44 18" aria-hidden="true" style={{ display: 'block' }}>
      <path
        d={`M ${(22 - half).toFixed(2)} ${(9 - lift).toFixed(2)} L 22 ${(9 + lift).toFixed(2)} L ${(22 + half).toFixed(2)} ${(9 - lift).toFixed(2)}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity={alpha}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

  // GymMane profile animations state: pull-down recap gesture, collapsing header, bar grow
  const [pull, setPull] = useState(0)
  const [burstKey, setBurstKey] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [barsReady, setBarsReady] = useState(false)

  const avatarFileRef = useRef(null)
  const bannerFileRef = useRef(null)
  const momentFileRef = useRef(null)
  const avatarAnchorRef = useRef(null)
  const pullRef = useRef({ active: false, pointerId: null, lastY: 0, value: 0, armed: false, origin: null })
  const springRaf = useRef(0)

  const reach = typeof window !== 'undefined'
    ? Math.max(115, Math.min(200, Math.round(205 * Math.pow((window.innerHeight || 840) / 873, 1.6))))
    : 160

  // Trigger staggered 12-month bar growth on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarsReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Collapsing sticky profile header progress
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(springRaf.current)
    }
  }, [])

  const springPullBack = () => {
    cancelAnimationFrame(springRaf.current)
    const from = pullRef.current.value
    if (from <= 0) { setPull(0); return }
    const startTs = performance.now()
    const dur = 320
    const tick = now => {
      const k = Math.min(1, (now - startTs) / dur)
      const next = from * (1 - easeOutCubic(k))
      pullRef.current.value = next
      setPull(next)
      if (k < 1) {
        springRaf.current = requestAnimationFrame(tick)
      } else {
        pullRef.current.value = 0
        pullRef.current.armed = false
        setPull(0)
      }
    }
    springRaf.current = requestAnimationFrame(tick)
  }

  const startPull = (clientY, pointerId, target) => {
    if (showRecap || showEditProfile || showBugReport) return
    if (target?.closest?.('.profile-stats-row, input, textarea, select')) return
    if ((window.scrollY || 0) > 2) return
    cancelAnimationFrame(springRaf.current)
    const rect = avatarAnchorRef.current?.getBoundingClientRect?.()
    pullRef.current = {
      active: true,
      pointerId,
      lastY: clientY,
      value: pullRef.current.value,
      armed: pullRef.current.armed,
      origin: rect && rect.width ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 63, y: 170 },
    }
  }

  const movePull = (clientY, ev) => {
    const st = pullRef.current
    if (!st.active) return
    const dy = clientY - st.lastY
    st.lastY = clientY
    const atTop = (window.scrollY || 0) <= 2
    if (st.value <= 0 && !(atTop && dy > 0)) return
    const drag = dy < 0 ? 0.8 : 0.66 * (1 - Math.min(0.88, Math.max(0, st.value / (reach * 1.45))))
    const next = Math.max(0, Math.min(reach * 1.3, st.value + dy * drag))
    st.value = next
    setPull(next)
    if (next > 2 && ev?.cancelable) ev.preventDefault?.()
    const armed = next >= reach
    if (armed !== st.armed) {
      st.armed = armed
      if (armed) {
        try { navigator.vibrate?.(28) } catch {}
        setBurstKey(k => k + 1)
      }
    }
  }

  const releasePull = () => {
    const st = pullRef.current
    if (!st.active) return
    st.active = false
    if (st.value <= 0) return
    if (st.value >= reach) {
      st.value = 0
      st.armed = false
      setPull(0)
      setShowRecap(true)
      return
    }
    st.armed = false
    springPullBack()
  }

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
  const displayName = trimmedName || 'Athlete'
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

  const currentMonthName = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'long' }),
    []
  )

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

  // Pull-down-to-recap derived geometry (exact GymMane profile_screen.dart math)
  const p = clamp01(pull / reach)
  const armed = pull >= reach
  const grabberT = easeOutCubic(clamp01(pull / 64))
  const stickyBar = clamp01((scrollY - 115) / 55)

  const traveller = (() => {
    if (p <= 0 || typeof window === 'undefined') return null
    const vw = window.innerWidth || 390
    const vh = window.innerHeight || 844
    const big = 86 + (RECAP_AVATAR_SIZE - 86) * easeInOutSine(p)
    const cx = vw / 2
    const cy = Math.min(340, vh * 0.40)
    const ring = Math.min(vw / 2 - RECAP_AVATAR_SIZE / 2 - 14, 120)
    const startAngle = Math.PI * 0.82
    const entryX = cx + Math.cos(startAngle) * ring
    const entryY = cy + Math.sin(startAngle) * ring
    const orig = pullRef.current.origin || { x: 63, y: 170 }
    const sx = orig.x
    const sy = orig.y + pull * 0.55
    const split = 0.3
    let spotX, spotY
    if (p < split) {
      const k = Math.pow(p / split, 2)
      spotX = sx + (entryX - sx) * k
      spotY = sy + (entryY - sy) * k
    } else {
      const v = (p - split) / (1 - split)
      const angle = startAngle - 1.05 * Math.PI * easeInOutSine(v)
      const shrink = easeInCubic(clamp01((v - 0.35) / 0.65))
      spotX = cx + Math.cos(angle) * ring * (1 - shrink)
      spotY = cy + Math.sin(angle) * ring * (1 - shrink)
    }
    return {
      big,
      left: spotX - big / 2,
      top: spotY - big / 2,
      cx,
      cy,
    }
  })()

  return (
    <div
      className="narrow gm-profile-root"
      style={{ paddingBottom: 32, position: 'relative' }}
      onTouchStart={e => e.touches?.[0] && startPull(e.touches[0].clientY, 'touch', e.target)}
      onTouchMove={e => e.touches?.[0] && movePull(e.touches[0].clientY, e)}
      onTouchEnd={releasePull}
      onTouchCancel={releasePull}
      onPointerDown={e => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return
        startPull(e.clientY, e.pointerId, e.target)
      }}
      onPointerMove={e => {
        if (pullRef.current.active && pullRef.current.pointerId === e.pointerId) movePull(e.clientY, e)
      }}
      onPointerUp={e => {
        if (pullRef.current.pointerId === e.pointerId) releasePull()
      }}
      onPointerCancel={releasePull}
    >
      <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
      <input ref={bannerFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
      <input ref={momentFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMomentUpload} />

      {/* GymMane Collapsing Sticky Compact Header on Scroll */}
      {stickyBar > 0.02 && p <= 0 && (
        <div
          className="gm-profile-sticky"
          style={{ opacity: stickyBar }}
        >
          <div
            className="gm-profile-sticky-center"
            style={{ transform: `translateY(${(8 * (1 - stickyBar)).toFixed(1)}px)` }}
          >
            <div
              className="gm-mini-avatar"
              style={{
                background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : 'var(--surface-2)',
                color: avatarUrl ? 'transparent' : 'var(--label)',
              }}
            >
              {initials}
            </div>
            <span className="gm-profile-sticky-name">{displayName}</span>
            <Icon name="checkCircle" style={{ color: badgeColor, fontSize: 14, flex: 'none' }} />
          </div>
          <button
            type="button"
            className="gm-profile-sticky-gear"
            onClick={() => nav('/settings')}
            aria-label={t('Settings')}
          >
            <Icon name="gear" />
          </button>
        </div>
      )}

      {/* Pull-Down-to-Recap Giant Scrolling NameTicker Backdrop */}
      {p > 0 && (
        <div
          className="gm-pull-ticker-backdrop"
          aria-hidden="true"
          style={{
            opacity: Math.pow(clamp01((p - 0.15) / 0.85), 1.6),
            transform: `scale(${(1.3 - 0.3 * easeOutCubic(p)).toFixed(4)})`,
          }}
        >
          {[0, 1, 2, 3, 4].map(row => (
            <div
              key={row}
              className={'gm-name-ticker' + (row % 2 === 1 ? ' reverse' : '')}
              style={{ opacity: 0.72, lineHeight: 1.08 }}
            >
              {`${displayName.toUpperCase()} · `.repeat(10)}
            </div>
          ))}
        </div>
      )}

      {/* Pull-Down-to-Recap Orbiting Avatar Traveller + Concentric StoryRings */}
      {traveller && (
        <div className="gm-pull-traveller-layer" aria-hidden="true">
          {armed && (
            <div
              key={burstKey}
              className="gm-pull-rings"
              style={{ left: traveller.cx, top: traveller.cy, width: RECAP_AVATAR_SIZE, height: RECAP_AVATAR_SIZE }}
            >
              <div className="gm-story-ring" />
              <div className="gm-story-ring" style={{ animationDelay: '0.45s' }} />
              <div className="gm-story-ring" style={{ animationDelay: '0.9s' }} />
            </div>
          )}
          <div
            className={'gm-traveller-avatar' + (armed ? ' armed' : '')}
            style={{
              left: traveller.left,
              top: traveller.top,
              width: traveller.big,
              height: traveller.big,
              background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : 'var(--surface-2)',
              color: avatarUrl ? 'transparent' : 'var(--label)',
              fontSize: Math.round(traveller.big * 0.34),
            }}
          >
            {initials}
          </div>
          <div
            className="gm-pull-prompt"
            style={{
              top: traveller.cy + RECAP_AVATAR_SIZE / 2 + 34,
              opacity: clamp01((p - 0.45) / 0.45),
              color: armed ? 'var(--label)' : 'var(--label-2)',
            }}
          >
            {armed ? t('Release to open recap') : t('Pull for {0} recap', currentMonthName)}
          </div>
        </div>
      )}

      {/* Main Profile Body (slides & fades smoothly during pull-to-recap) */}
      <div
        style={{
          transform: pull > 0 ? `translateY(${(pull * 0.55).toFixed(1)}px)` : undefined,
          opacity: p > 0 ? Math.max(0, 1 - p) : 1,
          willChange: pull > 0 ? 'transform, opacity' : undefined,
        }}
      >
        {/* GymMane Full Cover Banner + Top-Right Gear + Overlapping Avatar + Edit Pill */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div
            onClick={() => bannerFileRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={t('Change cover banner')}
            style={{
              position: 'relative',
              height: 168,
              borderRadius: 26,
              overflow: 'hidden',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `url(${bannerUrl}) center/cover no-repeat var(--surface)`,
                transformOrigin: 'top center',
                transform: p > 0 ? `scale(${(1 + 0.35 * p).toFixed(3)})` : undefined,
                filter: p > 0 ? `blur(${(14 * p).toFixed(1)}px)` : undefined,
              }}
            />
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
                className="gm-recap-pill"
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

            {/* Centered Morphing Pull-Down Grabber Chevron */}
            <div
              onClick={e => { e.stopPropagation(); setShowRecap(true) }}
              title={t('Pull down for monthly recap')}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 4,
                zIndex: 2,
                display: 'flex',
                justifyContent: 'center',
                color: 'var(--label)',
              }}
            >
              <PullGrabber tVal={grabberT} />
            </div>
          </div>

          {/* Overlapping Avatar (left) & Edit Profile Pill (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 6px', marginTop: -44, position: 'relative', zIndex: 3 }}>
            <div
              ref={avatarAnchorRef}
              onClick={() => avatarFileRef.current?.click()}
              role="button"
              tabIndex={0}
              title={t('Tap to upload profile photo')}
              style={{
                position: 'relative',
                width: 86,
                height: 86,
                cursor: 'pointer',
                opacity: p > 0 ? 0 : 1,
              }}
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
                {displayName}
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
              {gmAwards.awards.slice(0, 4).map((a, idx) => (
                <img
                  key={a.id}
                  className="gm-medal-thumb"
                  src={a.earned ? `./smitrix-ui/badges/${a.id}.webp` : `./smitrix-ui/badges/${a.id}_off.webp`}
                  alt={a.name}
                  style={{
                    width: 58,
                    height: 58,
                    objectFit: 'contain',
                    opacity: a.earned ? 1 : 0.42,
                    animationDelay: `${idx * 70}ms`,
                  }}
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
              className="gm-photo-fan"
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
                      className="gm-photo-fan-card"
                      style={{
                        '--fan-rot': `${PHOTO_TURNS[idx]}deg`,
                        '--fan-shift': `${(idx - 1.5) * 6}px`,
                        width: 96,
                        height: 130,
                        marginLeft: idx === 0 ? 0 : -22,
                        marginTop: idx % 2 === 1 ? 10 : -2,
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

        {/* GymMane History / 12-Month Consistency Box with Staggered Bar Grow Animation */}
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
                const targetH = 6 + Math.round((m.count / yearSummary.peak) * 52)
                return (
                  <div
                    key={m.key}
                    onClick={() => m.count > 0 && nav('/history')}
                    title={`${m.fullName}: ${m.count}`}
                    style={{
                      height: barsReady ? targetH : 6,
                      borderRadius: 5,
                      background: m.isCurrent ? 'var(--ember)' : m.count > 0 ? 'var(--label-3)' : 'var(--surface-2)',
                      cursor: m.count > 0 ? 'pointer' : 'default',
                      transition: `height ${650 + (m.idx + 1) * 35}ms cubic-bezier(0.22, 1, 0.36, 1)`,
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
      </div>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      {showBugReport && <BugReportModal onClose={() => setShowBugReport(false)} />}
      {showRecap && <RecapModal open={showRecap} onClose={() => setShowRecap(false)} />}
    </div>
  )
}
