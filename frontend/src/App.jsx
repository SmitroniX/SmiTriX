import { useEffect, useLayoutEffect, useRef } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { bindUI } from './components/ui.jsx'
import { ACCENTS } from './lib/format.js'
import { setLang, useLang } from './lib/i18n.js'
import { setNav } from './lib/nav.js'
import { initBackButton } from './lib/back.js'
import { useWakeLock } from './lib/wakelock.js'
import { startFlow } from './sheets.jsx'
import Icon from './components/Icon.jsx'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Modals from './components/Modals.jsx'
import Toast from './components/Toast.jsx'
import RestTimer from './components/RestTimer.jsx'
import TimerFlash from './components/TimerFlash.jsx'
import { UpdateChecker } from './components/UpdateDialog.jsx'
import { TutorialPromptChecker } from './components/TutorialDialog.jsx'
import Login from './views/Login.jsx'
import MobileOnboarding from './views/MobileOnboarding.jsx'
import Home from './views/Home.jsx'
import CheckIn from './views/CheckIn.jsx'
import Plan from './views/Plan.jsx'
import RoutineEdit from './views/RoutineEdit.jsx'
import Workout from './views/Workout.jsx'
import Stats from './views/Stats.jsx'
import History from './views/History.jsx'
import Library from './views/Library.jsx'
import Muscles from './views/Muscles.jsx'
import Profile from './views/Profile.jsx'
import Settings from './views/Settings.jsx'
import PlansManager from './views/PlansManager.jsx'
import Admin from './views/Admin.jsx'
import CoachChat from './views/CoachChat.jsx'
import CoachIntake from './views/CoachIntake.jsx'
import CoachSetup from './views/CoachSetup.jsx'

// last known scrollY per route, so back-navigation can put the page where it was
const scrollPositions = new Map()

// Synchronously align /login path or OAuth/deep-link query params into location.hash
// BEFORE HashRouter mounts, so the initial render never falls through to <Route path="*" Navigate to="/home" />
try {
  if (typeof window !== 'undefined') {
    const wp = window.location.pathname || ''
    const ws = window.location.search || ''
    const wh = window.location.hash || ''
    if (
      wp.startsWith('/login') ||
      ws.includes('native_google=') ||
      ws.includes('oobCode=') ||
      ws.includes('google_id_token=') ||
      ws.includes('uid=') ||
      ws.includes('verified=') ||
      ws.includes('mode=')
    ) {
      if (ws.includes('native_google=1') || wh.includes('native_google=1')) {
        try { sessionStorage.setItem('smitrix_native_bridge', '1') } catch {}
      }
      if (!wh.startsWith('#/login')) {
        window.location.hash = '#/login' + ws
      }
    }
  }
} catch {}

bindUI(useUI)   // lets the shared controls open sheets without importing the store at module scope

// theme === 'system' follows the OS/browser preference instead of a fixed choice.
const resolveTheme = theme => (theme === 'light' || theme === 'dark' || theme === 'oled')
  ? theme
  : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

function applyPrefs(theme, accent) {
  const de = document.documentElement
  de.dataset.theme = resolveTheme(theme)
  de.dataset.accent = ACCENTS[accent] ? accent : 'sky'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = de.dataset.theme === 'light' ? '#f2f2f7' : '#000000'
}

function Shell() {
  const navigate = useNavigate()
  const loc = useLocation()
  const navType = useNavigationType()
  const { S, user, ready } = useStore()
  const isGuest = useStore(s => s.isGuest())
  const needsMobileOnboarding = useStore(s => s.needsMobileOnboarding)
  const langV = useLang()   // re-renders the whole shell when the language (pack) changes
  useEffect(() => { setNav(navigate) }, [navigate])
  useEffect(() => { applyPrefs(S.theme, S.accent) }, [S.theme, S.accent])
  // 'system' needs to react live if the OS theme flips while the app is open, not just on
  // the next mount — a fixed 'dark'/'light' choice never re-fires this since matchMedia
  // isn't consulted for those.
  useEffect(() => {
    if (S.theme !== 'system' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyPrefs(S.theme, S.accent)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [S.theme, S.accent])
  useEffect(() => { setLang(S.lang || 'en') }, [S.lang])
  useEffect(() => { document.documentElement.lang = S.lang || 'en' }, [langV, S.lang])
  // Forward navigation starts at the top; going back lands where you left off.
  // The position is recorded from scroll events rather than read at route
  // change, because by then a shorter page may already have clamped it.
  const pathRef = useRef(loc.pathname)
  useEffect(() => {
    const onScroll = () => {
      // Modals pins the body while a sheet is open; scrollY is 0 then, not a position.
      if (document.body.style.position === 'fixed') return
      scrollPositions.set(pathRef.current, window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useLayoutEffect(() => {
    pathRef.current = loc.pathname
    if (navType !== 'POP') { window.scrollTo(0, 0); return }
    const y = scrollPositions.get(loc.pathname) || 0
    // the restored view needs a layout pass before it is tall enough to scroll to y
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, y))
    return () => window.cancelAnimationFrame(frame)
  }, [loc.pathname, navType])
  // bound to the workout, not to the route — checking Stats mid-session keeps the screen on
  useWakeLock(!!S.active && S.keepAwake !== false)

  // Sync direct path/search (e.g. /login?native_google=1 or ?oobCode=...) into HashRouter
  useEffect(() => {
    try {
      const winPath = window.location.pathname || ''
      const winSearch = window.location.search || ''
      if (
        winPath.startsWith('/login') ||
        winSearch.includes('native_google=') ||
        winSearch.includes('oobCode=') ||
        winSearch.includes('google_id_token=') ||
        winSearch.includes('uid=') ||
        winSearch.includes('verified=') ||
        winSearch.includes('mode=')
      ) {
        if (!loc.pathname.startsWith('/login')) {
          navigate('/login' + (winSearch || loc.search || ''), { replace: true })
        }
      }
    } catch {}
  }, [navigate, loc.pathname, loc.search])

  // Handle mobile deep links and app links (smitrix:// and https://smitrix.web.app)
  useEffect(() => {
    let removeListener = null
    let lastHandledUrl = ''

    const handleDeepLink = rawUrl => {
      if (!rawUrl || rawUrl === lastHandledUrl) return
      lastHandledUrl = rawUrl
      try {
        let target = rawUrl
          .replace(/^smitrix:\/\//i, '/')
          .replace(/^https?:\/\/(?:smitrix\.web\.app|smitrix\.firebaseapp\.com|aniplex-b74b5\.firebaseapp\.com)/i, '')

        // If the URL includes a hash portion (#/login?...), prefer the query string with the most parameters
        const hashIdx = target.indexOf('#')
        if (hashIdx !== -1) {
          const beforeHash = target.slice(0, hashIdx)
          const afterHash = target.slice(hashIdx + 1)
          target = afterHash.includes('?') ? afterHash : beforeHash
        }

        if (!target.startsWith('/')) target = '/' + target
        const qIdx = target.indexOf('?')
        const path = qIdx !== -1 ? target.slice(0, qIdx) : target
        const q = qIdx !== -1 ? target.slice(qIdx) : ''

        if (
          path.includes('login') ||
          rawUrl.includes('login') ||
          q.includes('google_id_token') ||
          q.includes('uid=') ||
          q.includes('oobCode') ||
          q.includes('verified') ||
          q.includes('mode=')
        ) {
          // Immediately hydrate authenticated user inside the native app if uid or tokens are present
          const sp = new URLSearchParams(q.replace(/^\?/, ''))
          const incomingUid = sp.get('uid') || ''
          const idToken = sp.get('google_id_token') || ''
          const accessToken = sp.get('google_access_token') || ''
          if (incomingUid) {
            const userObj = {
              id: incomingUid,
              name: sp.get('name') || (sp.get('email') ? sp.get('email').split('@')[0] : 'Athlete'),
              email: sp.get('email') || '',
              emailVerified: sp.get('verified') === '1' || sp.get('verified') === 'true',
              photoURL: sp.get('photo') || '',
              admin: false,
              firebase: true,
            }
            useStore.getState().setUser(userObj)
            if (idToken || accessToken) {
              import('./lib/firebase.js').then(m => m.signInWithGoogleTokens(idToken, accessToken)).catch(() => {})
            }
            useStore.getState().pullState().catch(() => {})
            useUI.getState().toast('Welcome, ' + userObj.name)
            navigate('/profile', { replace: true })
            return
          }
          navigate('/login' + q)
          if (q.includes('verified=true')) {
            useUI.getState().toast('Email verified! You can now sign in.')
          }
        } else if (path && path !== '/') {
          navigate(path + q)
        }
      } catch (e) {
        console.warn('Deep link routing error:', e)
      }
    }

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', data => {
        if (data?.url) handleDeepLink(data.url)
      }).then(handle => {
        removeListener = handle
      }).catch(() => {})
      CapApp.getLaunchUrl?.().then(res => {
        if (res?.url) handleDeepLink(res.url)
      }).catch(() => {})
    }).catch(() => {})

    return () => {
      removeListener?.remove?.()
    }
  }, [navigate])

  const authed = user || isGuest
  if (!ready && !authed) return (
    <div id="app">
      <div style={{ paddingTop: '44vh', display: 'flex', justifyContent: 'center', fontSize: 34, color: 'var(--label-3)' }}>
        <Icon name="dumbbell" />
      </div>
    </div>
  )

  const isMobileWeb = import.meta.env.VITE_MOBILE !== '1' && typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '')
  const appDeepLink = user?.id
    ? `smitrix://login?uid=${encodeURIComponent(user.id)}&name=${encodeURIComponent(user.name || '')}&email=${encodeURIComponent(user.email || '')}&photo=${encodeURIComponent(user.photoURL || '')}&verified=${user.emailVerified ? '1' : '0'}`
    : 'smitrix://login'

  return (
    <>
      {/* Mobile Web → Native Android App Handoff Bar */}
      {isMobileWeb && user?.id && !loc.pathname.startsWith('/login') && (
        <div style={{
          background: '#172331',
          borderBottom: '1px solid #1d9bf0',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f5f6f8' }}>
            Signed in as <b style={{ color: '#1d9bf0' }}>{user.name || user.email}</b>
          </div>
          <a
            href={appDeepLink}
            style={{
              background: '#1d9bf0',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              padding: '7px 14px',
              borderRadius: 999,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Open SmiTriX App →
          </a>
        </div>
      )}
      {/* keyed on the route: a view that throws is contained, and switching tabs
          re-mounts the boundary, so the tab bar is always a way out */}
      <div id="app" className="vfade" key={loc.pathname}>
        <ErrorBoundary>
          {!authed ? <Login /> : needsMobileOnboarding ? <MobileOnboarding /> : (
            <Routes>
              <Route path="/home" element={<Home />} />
              {/* Gym check-in — switched off in Settings, the route falls through to the
                  catch-all redirect below. */}
              {S.checkIn !== false && <Route path="/checkin" element={<CheckIn />} />}
              <Route path="/plan" element={<Plan />} />
              <Route path="/plan/r/:id" element={<RoutineEdit />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/history" element={<History />} />
              <Route path="/library" element={<Library />} />
              <Route path="/muscles" element={<Muscles />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/plans" element={<PlansManager />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login />} />
              {/* The Coach screens gate themselves on the instance config; the routes exist
                  unconditionally so a deep link from a notification lands somewhere sane
                  rather than on the catch-all. */}
              <Route path="/coach" element={<CoachChat />} />
              <Route path="/coach/intake" element={<CoachIntake />} />
              <Route path="/coach/proposal" element={<Navigate to="/coach" replace />} />
              <Route path="/coach/setup" element={<CoachSetup />} />
              <Route path="/admin" element={user?.admin ? <Admin /> : <Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          )}
        </ErrorBoundary>
      </div>
      {/* The chat owns the bottom of the screen: its composer sits where the tabs would be. */}
      {!needsMobileOnboarding && loc.pathname !== '/coach' && <TabBar onStart={startFlow} />}
      <RestTimer />
      <Modals />
      <Toast />
      <TimerFlash />
      <UpdateChecker />
      <TutorialPromptChecker />
    </>
  )
}

export default function App() {
  const boot = useStore(s => s.boot)
  useEffect(() => { boot() }, [boot])
  // Android system back — sheet, then page, then press-again-to-exit (see lib/back.js)
  useEffect(() => {
    let stop = null, gone = false
    initBackButton().then(fn => { if (gone) fn(); else stop = fn })
    return () => { gone = true; stop?.() }
  }, [])
  return <HashRouter><Shell /></HashRouter>
}
