import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  ADMIN_EMAIL,
  isAdminEmail,
  signInWithGoogle,
  loginWithEmailPassword,
  logoutUser,
  fetchAdminCloudDashboard,
  updateCloudBugReport,
  deleteCloudRecord,
  submitCloudBugReport
} from '../lib/firebase.js'
import { fmtDate, fmtNum } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import '../admin.css'

const relTime = ts => {
  if (!ts) return 'never'
  const s = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function UserCloudInspectorModal({ u, close }) {
  const [subTab, setSubTab] = useState('workouts')
  const toast = useUI(s => s.toast)
  const st = u.state || {}
  const workouts = (st.workouts || []).slice().reverse()
  const routines = st.routines || []
  const bodyweight = (st.bodyweight || []).slice().reverse()

  const handleCopyJson = () => {
    try {
      navigator.clipboard?.writeText(JSON.stringify(st, null, 2))
      toast('Copied user cloud JSON to clipboard')
    } catch {
      toast('Could not copy JSON')
    }
  }

  return (
    <div className="sheet-backdrop" onClick={close} style={{ zIndex: 120 }}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 680, width: '95vw', margin: 'auto', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div className="row between" style={{ marginBottom: 14, alignItems: 'center' }}>
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: u.photoURL ? `url(${u.photoURL}) center/cover no-repeat` : '#1f2229',
                border: '2px solid #1d9bf0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 18,
                color: u.photoURL ? 'transparent' : '#f5f6f8'
              }}
            >
              {(u.name || u.email || 'A')[0].toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{u.name || 'Athlete'}</h3>
              <div style={{ fontSize: 12, color: '#8e939e' }}>
                {u.email || 'No email'} · UID: <code style={{ color: '#1d9bf0' }}>{u.uid}</code>
              </div>
            </div>
          </div>
          <button className="iconbtn" onClick={close} aria-label="Close">
            <Icon name="xmark" />
          </button>
        </div>

        {/* Summary Stat Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#8e939e' }}>Workouts</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f5f6f8' }}>{u.workoutCount ?? workouts.length}</div>
          </div>
          <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#8e939e' }}>Total Volume</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1d9bf0' }}>
              {fmtNum(u.totalVolume || 0)} {u.unit || st.unit || 'kg'}
            </div>
          </div>
          <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#8e939e' }}>Routines</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f5f6f8' }}>{u.routineCount ?? routines.length}</div>
          </div>
          <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#8e939e' }}>Weigh-ins</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f5f6f8' }}>{u.bodyweightCount ?? bodyweight.length}</div>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="row" style={{ gap: 8, marginBottom: 14, borderBottom: '1px solid #1f2229', paddingBottom: 10 }}>
          {[
            { id: 'workouts', label: `Workouts (${workouts.length})` },
            { id: 'routines', label: `Routines (${routines.length})` },
            { id: 'bodyweight', label: `Measures (${bodyweight.length})` },
            { id: 'json', label: 'Raw Cloud JSON' }
          ].map(tb => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setSubTab(tb.id)}
              style={{
                background: subTab === tb.id ? '#1d9bf0' : '#15171c',
                color: subTab === tb.id ? '#ffffff' : '#9ca3af',
                border: '1px solid #1f2229',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {subTab === 'workouts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workouts.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#8e939e', background: '#15171c', borderRadius: 12 }}>
                No workouts logged in cloud yet for this user.
              </div>
            ) : (
              workouts.map((w, i) => {
                const entries = w.entries || []
                return (
                  <div
                    key={w.id || i}
                    style={{
                      background: '#15171c',
                      border: '1px solid #1f2229',
                      borderRadius: 12,
                      padding: '12px 14px'
                    }}
                  >
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <b style={{ fontSize: 15, color: '#f5f6f8' }}>{w.name || 'Workout Session'}</b>
                      <span style={{ fontSize: 12, color: '#1d9bf0', fontWeight: 700 }}>{w.d || '—'}</span>
                    </div>
                    {entries.map((e, idx) => {
                      const ex = exOr(e.id)
                      const doneSets = (e.sets || []).filter(s => s.done)
                      return (
                        <div key={idx} style={{ fontSize: 12.5, color: '#d1d5db', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <b style={{ textTransform: 'capitalize' }}>{ex ? exerciseNameFor(ex) : e.id}</b>:{' '}
                          <span style={{ color: '#8e939e' }}>
                            {doneSets.map(s => `${s.w || 0}${st.unit || 'kg'} × ${s.r || 0}`).join(' · ') || 'No completed sets'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        )}

        {subTab === 'routines' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {routines.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#8e939e', background: '#15171c', borderRadius: 12 }}>
                No routines saved in cloud yet.
              </div>
            ) : (
              routines.map((r, i) => (
                <div key={r.id || i} style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#f5f6f8', marginBottom: 4 }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: '#8e939e' }}>
                    {(r.ex || []).map(x => {
                      const ex = exOr(x.id)
                      return ex ? exerciseNameFor(ex) : x.id
                    }).join(' · ') || 'No exercises'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {subTab === 'bodyweight' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bodyweight.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#8e939e', background: '#15171c', borderRadius: 12 }}>
                No body-weight entries logged in cloud yet.
              </div>
            ) : (
              bodyweight.map((b, i) => (
                <div key={i} className="row between" style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 10, padding: '10px 14px' }}>
                  <span style={{ color: '#d1d5db', fontSize: 13 }}>{b.d}</span>
                  <b style={{ color: '#1d9bf0', fontSize: 14 }}>{b.w} {st.unit || 'kg'}</b>
                </div>
              ))
            )}
          </div>
        )}

        {subTab === 'json' && (
          <div>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#8e939e' }}>Cloud Document: <code>users/{u.uid}/data/state</code></span>
              <button
                type="button"
                onClick={handleCopyJson}
                style={{ background: '#1d9bf0', color: '#fff', border: 0, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Copy JSON
              </button>
            </div>
            <pre style={{
              background: '#0d0e11',
              border: '1px solid #1f2229',
              borderRadius: 10,
              padding: 12,
              fontSize: 11.5,
              color: '#d1d5db',
              maxHeight: 340,
              overflow: 'auto'
            }}>
              {JSON.stringify(st, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Admin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const toast = useUI(s => s.toast)

  const [authEmail, setAuthEmail] = useState(ADMIN_EMAIL)
  const [authPass, setAuthPass] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authErr, setAuthErr] = useState('')

  const [tab, setTab] = useState('users') // 'users' | 'bugs' | 'posts' | 'subs'
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ users: [], bugReports: [], photoPosts: [], subscriptions: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [bugFilter, setBugFilter] = useState('all') // 'all' | 'open' | 'in_progress' | 'resolved'
  const [inspectedUser, setInspectedUser] = useState(null)

  // Quick admin bug creation form
  const [showNewBug, setShowNewBug] = useState(false)
  const [newBugTitle, setNewBugTitle] = useState('')
  const [newBugDesc, setNewBugDesc] = useState('')
  const [newBugSeverity, setNewBugSeverity] = useState('medium')

  const isAuthorizedAdmin = !!(user?.admin || isAdminEmail(user?.email))

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetchAdminCloudDashboard()
      setData(res)
    } catch (e) {
      toast(e.message || 'Failed to load cloud data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadDashboard()
    }
  }, [isAuthorizedAdmin])

  const handleAdminGoogleLogin = async () => {
    setAuthBusy(true)
    setAuthErr('')
    try {
      const fbUser = await signInWithGoogle()
      if (!isAdminEmail(fbUser.email)) {
        await logoutUser().catch(() => {})
        setAuthErr(`Signed in as ${fbUser.email}, which is not authorized. Please sign in with ${ADMIN_EMAIL}.`)
        return
      }
      setUser({
        id: fbUser.uid,
        name: fbUser.displayName || 'Asmit (Admin)',
        email: fbUser.email,
        photoURL: fbUser.photoURL || '',
        emailVerified: true,
        admin: true,
        firebase: true
      })
      toast('Welcome to SmiTriX Cloud Admin')
    } catch (e) {
      setAuthErr(e.message || 'Google sign-in failed')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleAdminEmailLogin = async e => {
    e?.preventDefault?.()
    setAuthBusy(true)
    setAuthErr('')
    try {
      if (!isAdminEmail(authEmail)) {
        setAuthErr(`Only ${ADMIN_EMAIL} has Admin Dashboard access.`)
        setAuthBusy(false)
        return
      }
      const fbUser = await loginWithEmailPassword(authEmail.trim(), authPass)
      setUser({
        id: fbUser.uid,
        name: fbUser.displayName || 'Asmit (Admin)',
        email: fbUser.email,
        photoURL: fbUser.photoURL || '',
        emailVerified: !!fbUser.emailVerified,
        admin: true,
        firebase: true
      })
      toast('Welcome to SmiTriX Cloud Admin')
    } catch (err) {
      setAuthErr(err.message || 'Invalid admin credentials')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleUpdateBugStatus = async (reportId, status) => {
    try {
      await updateCloudBugReport(reportId, { status })
      setData(prev => ({
        ...prev,
        bugReports: prev.bugReports.map(b => (b.id === reportId ? { ...b, status, updatedAt: Date.now() } : b))
      }))
      toast(`Bug marked as ${status.replace('_', ' ')}`)
    } catch (e) {
      toast(e.message || 'Could not update bug status')
    }
  }

  const handleDeleteRecord = async (docId, typeLabel) => {
    try {
      await deleteCloudRecord(docId)
      setData(prev => ({
        ...prev,
        bugReports: prev.bugReports.filter(b => b.id !== docId),
        photoPosts: prev.photoPosts.filter(p => p.id !== docId),
        users: prev.users.filter(u => u.id !== docId)
      }))
      toast(`${typeLabel} deleted from cloud`)
    } catch (e) {
      toast(e.message || 'Delete failed')
    }
  }

  const handleCreateAdminBug = async e => {
    e?.preventDefault?.()
    if (!newBugTitle.trim()) return
    try {
      const created = await submitCloudBugReport({
        title: newBugTitle,
        description: newBugDesc,
        category: 'admin_logged',
        severity: newBugSeverity,
        user
      })
      setData(prev => ({ ...prev, bugReports: [created, ...prev.bugReports] }))
      setNewBugTitle('')
      setNewBugDesc('')
      setShowNewBug(false)
      toast('Bug report logged to cloud')
    } catch (err) {
      toast(err.message || 'Could not log bug')
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return data.users
    return data.users.filter(u =>
      String(u.name || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.uid || '').toLowerCase().includes(q) ||
      String(u.tier || '').toLowerCase().includes(q)
    )
  }, [data.users, searchQuery])

  const filteredBugs = useMemo(() => {
    if (bugFilter === 'all') return data.bugReports
    return data.bugReports.filter(b => (b.status || 'open') === bugFilter)
  }, [data.bugReports, bugFilter])

  const totalCloudWorkouts = useMemo(
    () => data.users.reduce((s, u) => s + (Number(u.workoutCount) || (u.state?.workouts?.length || 0)), 0),
    [data.users]
  )
  const totalCloudVolume = useMemo(
    () => data.users.reduce((s, u) => s + (Number(u.totalVolume) || 0), 0),
    [data.users]
  )
  const openBugsCount = useMemo(
    () => data.bugReports.filter(b => (b.status || 'open') !== 'resolved').length,
    [data.bugReports]
  )

  // If not signed in as smitronix0826@gmail.com, show the dedicated Admin Sign-In Gate
  if (!isAuthorizedAdmin) {
    return (
      <div className="narrow" style={{ maxWidth: 440, margin: '36px auto', padding: '0 16px' }}>
        <div
          style={{
            background: '#15171c',
            border: '1px solid #1f2229',
            borderRadius: 16,
            padding: '28px 22px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: 'rgba(29, 155, 240, 0.14)',
              border: '1px solid rgba(29, 155, 240, 0.4)',
              color: '#1d9bf0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              fontSize: 24
            }}
          >
            <Icon name="shield" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#f5f6f8' }}>
            SmiTriX Cloud Admin
          </h1>
          <div style={{ fontSize: 13, color: '#8e939e', marginBottom: 20, lineHeight: 1.5 }}>
            Authorized administrator access for <b style={{ color: '#1d9bf0' }}>{ADMIN_EMAIL}</b> to monitor all app users, cloud workout data, and bug reports.
          </div>

          {authErr && (
            <div
              style={{
                background: 'rgba(244, 33, 46, 0.14)',
                border: '1px solid #f4212e',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 12.5,
                color: '#f5f6f8',
                marginBottom: 16,
                textAlign: 'left'
              }}
            >
              {authErr}
            </div>
          )}

          <button
            type="button"
            className="btn primary"
            onClick={handleAdminGoogleLogin}
            disabled={authBusy}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '13px 16px',
              fontSize: 14.5,
              fontWeight: 700,
              borderRadius: 12,
              marginBottom: 16
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ background: '#fff', borderRadius: '50%', padding: 2 }}>
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span>{authBusy ? 'Signing in...' : `Continue with Google (${ADMIN_EMAIL})`}</span>
          </button>

          <div style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 12px' }}>OR SIGN IN WITH ADMIN PASSWORD</div>

          <form onSubmit={handleAdminEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            <input
              className="input"
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              placeholder={ADMIN_EMAIL}
              required
            />
            <input
              className="input"
              type="password"
              value={authPass}
              onChange={e => setAuthPass(e.target.value)}
              placeholder="Admin password"
              required
            />
            <Button variant="ghost" type="submit" disabled={authBusy} style={{ marginTop: 4, border: '1px solid #2c303a' }}>
              Sign In to Admin Console
            </Button>
          </form>

          <button
            type="button"
            onClick={() => nav('/home')}
            style={{ marginTop: 18, color: '#8e939e', fontSize: 13, background: 'transparent', border: 0, cursor: 'pointer' }}
          >
            ← Back to SmiTriX
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="narrow" style={{ maxWidth: 880, paddingBottom: 40 }}>
      {/* Top Admin Command Bar */}
      <div className="row between" style={{ padding: '8px 0 16px', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="iconbtn" onClick={() => nav('/home')} aria-label="Back">
            <Icon name="back" />
          </button>
          <div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>SmiTriX Cloud Admin</h1>
              <span style={{ background: 'rgba(29, 155, 240, 0.16)', color: '#1d9bf0', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>
                LIVE CLOUD
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#8e939e' }}>
              Signed in as <b style={{ color: '#f5f6f8' }}>{user?.email || ADMIN_EMAIL}</b>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            style={{
              background: '#15171c',
              border: '1px solid #2c303a',
              color: '#f5f6f8',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Icon name="refresh" />
            <span>{loading ? 'Syncing...' : 'Refresh Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10, marginBottom: 18 }}>
        <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: '#8e939e', marginBottom: 4 }}>App Users in Cloud</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f5f6f8' }}>{data.users.length}</div>
          <div style={{ fontSize: 11.5, color: '#00ba7c', marginTop: 2 }}>100% Cloud-Synced Profiles</div>
        </div>
        <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: '#8e939e', marginBottom: 4 }}>Cloud Workouts Logged</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1d9bf0' }}>{fmtNum(totalCloudWorkouts)}</div>
          <div style={{ fontSize: 11.5, color: '#8e939e', marginTop: 2 }}>{fmtNum(totalCloudVolume)} kg total volume</div>
        </div>
        <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: '#8e939e', marginBottom: 4 }}>Open Bug Reports</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: openBugsCount > 0 ? '#f4212e' : '#00ba7c' }}>
            {openBugsCount}
          </div>
          <div style={{ fontSize: 11.5, color: '#8e939e', marginTop: 2 }}>{data.bugReports.length} total reports submitted</div>
        </div>
        <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: '#8e939e', marginBottom: 4 }}>Paid Plans & Photo Posts</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#ffd400' }}>{data.subscriptions.length}</div>
          <div style={{ fontSize: 11.5, color: '#8e939e', marginTop: 2 }}>{data.photoPosts.length} workout photos posted</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row" style={{ gap: 8, overflowX: 'auto', marginBottom: 18, borderBottom: '1px solid #1f2229', paddingBottom: 10 }}>
        {[
          { id: 'users', label: `👥 App Users & Cloud Data (${data.users.length})` },
          { id: 'bugs', label: `🐛 Bug Reports (${data.bugReports.length})` },
          { id: 'posts', label: `📸 Workout Photos (${data.photoPosts.length})` },
          { id: 'subs', label: `💳 Subscriptions (${data.subscriptions.length})` }
        ].map(tItem => {
          const active = tab === tItem.id
          return (
            <button
              key={tItem.id}
              type="button"
              onClick={() => setTab(tItem.id)}
              style={{
                background: active ? '#1d9bf0' : '#15171c',
                color: active ? '#ffffff' : '#d1d5db',
                border: '1px solid #1f2229',
                borderRadius: 999,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {tItem.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: USERS & ALL CLOUD DATA */}
      {tab === 'users' && (
        <div>
          <div className="row between" style={{ gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder="Search users by name, email, UID, or tier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 240 }}
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: 28, textAlign: 'center', color: '#8e939e' }}>
              No cloud users matched your search. Users appear here automatically as soon as they sign in or log data in the SmiTriX app.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredUsers.map(u => (
                <div
                  key={u.uid}
                  style={{
                    background: '#15171c',
                    border: '1px solid #1f2229',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap'
                  }}
                >
                  <div className="row" style={{ gap: 12, alignItems: 'center', minWidth: 220 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: u.photoURL ? `url(${u.photoURL}) center/cover no-repeat` : '#1f2229',
                        border: '1.5px solid #2c303a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        color: u.photoURL ? 'transparent' : '#f5f6f8',
                        flexShrink: 0
                      }}
                    >
                      {(u.name || u.email || 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 15, color: '#f5f6f8' }}>{u.name || 'Athlete'}</b>
                        {isAdminEmail(u.email) && (
                          <span style={{ background: '#1d9bf0', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999 }}>
                            OWNER ADMIN
                          </span>
                        )}
                        <span style={{ background: '#1f2229', color: '#9ca3af', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase' }}>
                          {u.tier || 'free'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#8e939e' }}>{u.email || 'No email'}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        UID: <code>{u.uid}</code> · Synced {relTime(u.updatedAt || u.lastLogin)}
                      </div>
                    </div>
                  </div>

                  <div className="row" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f6f8' }}>
                        {u.workoutCount ?? (u.state?.workouts?.length || 0)} workouts · {u.routineCount ?? (u.state?.routines?.length || 0)} routines
                      </div>
                      <div style={{ fontSize: 12, color: '#1d9bf0', fontWeight: 600 }}>
                        {fmtNum(u.totalVolume || 0)} {u.unit || 'kg'} volume lifted
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedUser(u)}
                      style={{
                        background: '#1d9bf0',
                        color: '#ffffff',
                        border: 0,
                        borderRadius: 10,
                        padding: '9px 14px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Inspect Cloud Data →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUG REPORTS & ISSUES */}
      {tab === 'bugs' && (
        <div>
          <div className="row between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Reports' },
                { id: 'open', label: 'Open' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'resolved', label: 'Resolved' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBugFilter(f.id)}
                  style={{
                    background: bugFilter === f.id ? '#1f2229' : 'transparent',
                    color: bugFilter === f.id ? '#1d9bf0' : '#8e939e',
                    border: '1px solid #1f2229',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowNewBug(v => !v)}
              style={{
                background: '#1d9bf0',
                color: '#fff',
                border: 0,
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Log Bug / Issue
            </button>
          </div>

          {showNewBug && (
            <form
              onSubmit={handleCreateAdminBug}
              style={{
                background: '#15171c',
                border: '1px solid #1d9bf0',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f5f6f8' }}>Log New Bug / Issue to Cloud Tracker</div>
              <input
                className="input"
                placeholder="Bug title / summary"
                value={newBugTitle}
                onChange={e => setNewBugTitle(e.target.value)}
                required
              />
              <textarea
                className="input"
                rows={3}
                placeholder="Steps to reproduce, device details, or error description..."
                value={newBugDesc}
                onChange={e => setNewBugDesc(e.target.value)}
              />
              <div className="row between" style={{ alignItems: 'center' }}>
                <select
                  className="input"
                  value={newBugSeverity}
                  onChange={e => setNewBugSeverity(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="low">Severity: Low</option>
                  <option value="medium">Severity: Medium</option>
                  <option value="high">Severity: High / Blocker</option>
                </select>
                <div className="row" style={{ gap: 8 }}>
                  <Button variant="ghost" type="button" onClick={() => setShowNewBug(false)} style={{ width: 'auto' }}>Cancel</Button>
                  <Button variant="primary" type="submit" style={{ width: 'auto' }}>Save Bug Report</Button>
                </div>
              </div>
            </form>
          )}

          {filteredBugs.length === 0 ? (
            <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: 28, textAlign: 'center', color: '#8e939e' }}>
              No bug reports in this view. Any bug reported by users in the SmiTriX app appears here immediately.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredBugs.map(b => {
                const sevColor = b.severity === 'high' ? '#f4212e' : b.severity === 'medium' ? '#ff7a00' : '#1d9bf0'
                const stColor = b.status === 'resolved' ? '#00ba7c' : b.status === 'in_progress' ? '#ffd400' : '#f4212e'
                return (
                  <div
                    key={b.id}
                    style={{
                      background: '#15171c',
                      border: '1px solid #1f2229',
                      borderRadius: 12,
                      padding: '14px 16px'
                    }}
                  >
                    <div className="row between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ background: sevColor, color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase' }}>
                          {b.severity || 'medium'}
                        </span>
                        <span style={{ background: '#1f2229', color: stColor, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, textTransform: 'uppercase' }}>
                          {(b.status || 'open').replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: 11.5, color: '#8e939e' }}>
                          {b.category || 'bug'} · v{b.appVersion || '1.7.4'} · {relTime(b.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8e939e' }}>
                        Reported by <b style={{ color: '#f5f6f8' }}>{b.userName || 'Athlete'}</b> ({b.userEmail || b.uid || 'anonymous'})
                      </div>
                    </div>

                    <div style={{ fontSize: 15.5, fontWeight: 700, color: '#f5f6f8', marginBottom: 6 }}>
                      {b.title}
                    </div>
                    <div style={{ fontSize: 13.5, color: '#d1d5db', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                      {b.description}
                    </div>

                    {b.screenshotDataUrl && (
                      <div style={{ marginBottom: 12 }}>
                        <img
                          src={b.screenshotDataUrl}
                          alt="Bug attachment"
                          style={{ maxHeight: 220, borderRadius: 10, border: '1px solid #2c303a' }}
                        />
                      </div>
                    )}

                    <div className="row between" style={{ borderTop: '1px solid #1f2229', paddingTop: 10, flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        Route: <code>{b.route || '/'}</code> · Device: {(b.device || '').slice(0, 70)}
                      </span>
                      <div className="row" style={{ gap: 6 }}>
                        {['open', 'in_progress', 'resolved'].map(stKey => (
                          <button
                            key={stKey}
                            type="button"
                            onClick={() => handleUpdateBugStatus(b.id, stKey)}
                            style={{
                              background: (b.status || 'open') === stKey ? '#1d9bf0' : '#1f2229',
                              color: (b.status || 'open') === stKey ? '#fff' : '#d1d5db',
                              border: 0,
                              borderRadius: 6,
                              padding: '5px 10px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              textTransform: 'capitalize'
                            }}
                          >
                            {stKey.replace('_', ' ')}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(b.id, 'Bug report')}
                          style={{
                            background: 'rgba(244, 33, 46, 0.15)',
                            color: '#f4212e',
                            border: 0,
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WORKOUT PHOTO POSTS */}
      {tab === 'posts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {data.photoPosts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: 28, textAlign: 'center', color: '#8e939e' }}>
              No workout photo posts uploaded yet.
            </div>
          ) : (
            data.photoPosts.map(p => (
              <div key={p.id} style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, overflow: 'hidden' }}>
                {p.photoDataUrl && (
                  <img src={p.photoDataUrl} alt="Workout" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: 12 }}>
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <b style={{ fontSize: 14, color: '#f5f6f8' }}>{p.athleteName || 'Athlete'}</b>
                    <span style={{ fontSize: 11.5, color: '#8e939e' }}>{relTime(p.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 10 }}>
                    {p.workoutName || 'Workout Post'} · ❤️ {p.kudos || 0}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(p.id, 'Photo post')}
                    style={{
                      width: '100%',
                      background: 'rgba(244, 33, 46, 0.14)',
                      color: '#f4212e',
                      border: 0,
                      borderRadius: 8,
                      padding: '7px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Remove Post
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: SUBSCRIPTIONS */}
      {tab === 'subs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.subscriptions.length === 0 ? (
            <div style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: 28, textAlign: 'center', color: '#8e939e' }}>
              No paid subscription transactions recorded in Cloud Firestore yet.
            </div>
          ) : (
            data.subscriptions.map(sub => (
              <div
                key={sub.id}
                className="row between"
                style={{ background: '#15171c', border: '1px solid #1f2229', borderRadius: 12, padding: '14px 16px', flexWrap: 'wrap', gap: 10 }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#f5f6f8' }}>
                    {sub.planName || sub.planId} · <span style={{ color: '#00ba7c' }}>{sub.amountFormatted || sub.amount}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#8e939e' }}>
                    {sub.userEmail || sub.userName || sub.uid} · Method: {sub.method || 'UPI / Card'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    Tx ID: <code>{sub.transactionId || sub.id}</code>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#8e939e' }}>{relTime(sub.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {inspectedUser && (
        <UserCloudInspectorModal u={inspectedUser} close={() => setInspectedUser(null)} />
      )}
    </div>
  )
}
