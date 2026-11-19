import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, BIO } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { MOBILE } from '../lib/mobile.js'
import {
  signInWithGoogle,
  signInWithGoogleTokens,
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendPasswordReset,
  applyEmailVerificationCode,
  completePasswordReset,
  refreshCurrentUser
} from '../lib/firebase.js'
import { trackEvent, recordSecurityEvent } from '../lib/analytics.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

function getMergedSearchParams(locSearch = '') {
  const merged = new URLSearchParams()
  const absorb = raw => {
    if (!raw) return
    const qIdx = raw.indexOf('?')
    const qs = qIdx !== -1 ? raw.slice(qIdx + 1) : raw.replace(/^[?#]/, '')
    const sp = new URLSearchParams(qs)
    for (const [k, v] of sp.entries()) {
      if (!merged.has(k)) merged.set(k, v)
    }
  }
  if (typeof window !== 'undefined') {
    absorb(window.location.search)
    absorb(window.location.hash)
  }
  absorb(locSearch)
  // Unwrap Firebase Dynamic Link ?link=... if present
  if (merged.has('link')) {
    absorb(merged.get('link'))
  }
  return merged
}

function ForgotPasswordSheet({ close, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleReset = async e => {
    e?.preventDefault?.()
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      useUI.getState().toast(t('Enter a valid email address'))
      return
    }
    setBusy(true)
    try {
      await sendPasswordReset(cleanEmail)
      setSent(true)
      recordSecurityEvent('password_reset_request', { email: cleanEmail })
      useUI.getState().toast(t('Password reset link sent to your email'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to send reset link'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className="lrow-i" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--blue)' }}>
          <Icon name="key" />
        </span>
        <div>
          <h3 style={{ margin: 0 }}>{t('Reset Password')}</h3>
          <div className="muted small">{t('Enter your account email to receive a secure recovery link.')}</div>
        </div>
      </div>

      {sent ? (
        <div className="card" style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--acc)', margin: '14px 0' }}>
          <div style={{ fontWeight: 600, color: 'var(--acc)', marginBottom: 4 }}>{t('Email Dispatched')}</div>
          <div className="small muted">
            {t('Check your inbox (and spam folder) for instructions to reset your password.')}
          </div>
          <div style={{ height: 16 }} />
          <Button variant="primary" onClick={close}>{t('Close')}</Button>
        </div>
      ) : (
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <input
            className="input"
            type="email"
            placeholder={t('Email address')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            required
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Button variant="ghost" type="button" onClick={close} style={{ flex: 1 }}>{t('Cancel')}</Button>
            <Button variant="primary" type="submit" disabled={busy} style={{ flex: 1 }}>
              {busy ? t('Sending...') : t('Send Recovery Link')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function PasskeyRegisterSheet({ close }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const inviteOnly = !!config?.invite_only
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  useEffect(() => { loadConfig() }, [loadConfig])

  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim())
      setUser(u); close()
      recordSecurityEvent('passkey_registered', { uid: u.id })
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        recordSecurityEvent('passkey_reg_fail', { error: e.message })
        useUI.getState().toast(e.message || t('Registration failed'))
      }
    }
  }

  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', BIO)}</div>
    <input ref={ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}

export default function Login() {
  const nav = useNavigate()
  const loc = useLocation()
  const { setUser, pushState, pullState, setGuest } = useStore()
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const canGoBack = !!(user || isGuest)

  const [mode, setMode] = useState('login') // 'login', 'register', 'passkey'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statusBanner, setStatusBanner] = useState(null) // { type: 'info' | 'success' | 'error', text: string }
  const [nativeReturnUrl, setNativeReturnUrl] = useState('')
  const [resetOobCode, setResetOobCode] = useState('')
  const [newResetPassword, setNewResetPassword] = useState('')

  const isMobileBrowser = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '')
  const searchParams = getMergedSearchParams(loc.search)
  const isNativeGoogleBridge = !MOBILE && searchParams.get('native_google') === '1'

  const triggerNativeAppRedirect = qs => {
    const smitrixUrl = `smitrix://login?${qs}`
    const intentUrl = `intent://login?${qs}#Intent;scheme=smitrix;package=com.smitrix.app;S.browser_fallback_url=${encodeURIComponent('https://smitrix.web.app/#/profile')};end`
    setNativeReturnUrl(smitrixUrl)
    try {
      const a = document.createElement('a')
      a.href = smitrixUrl
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {}
    try {
      window.location.replace(smitrixUrl)
    } catch {}
    setTimeout(() => {
      try {
        window.location.href = intentUrl
      } catch {}
    }, 300)
  }

  const applyFirebaseUser = async fbUser => {
    const userObj = {
      id: fbUser.uid,
      name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Athlete'),
      email: fbUser.email || '',
      emailVerified: !!fbUser.emailVerified,
      photoURL: fbUser.photoURL || '',
      admin: false,
      firebase: true
    }

    const qsParams = new URLSearchParams()
    if (fbUser?._oauthIdToken) qsParams.set('google_id_token', fbUser._oauthIdToken)
    if (fbUser?._oauthAccessToken) qsParams.set('google_access_token', fbUser._oauthAccessToken)
    if (userObj.id) qsParams.set('uid', userObj.id)
    if (userObj.name) qsParams.set('name', userObj.name)
    if (userObj.email) qsParams.set('email', userObj.email)
    if (userObj.photoURL) qsParams.set('photo', userObj.photoURL)
    qsParams.set('verified', userObj.emailVerified ? '1' : '0')
    const qs = qsParams.toString()

    // If we are running inside the browser as the OAuth bridge for the Android APK,
    // immediately auto-redirect back to the SmiTriX Android app
    if (isNativeGoogleBridge && qs) {
      setUser(userObj)
      setStatusBanner({
        type: 'success',
        text: t('Sign-In complete! Auto-redirecting to the SmiTriX Android app...')
      })
      triggerNativeAppRedirect(qs)
      return
    }

    setUser(userObj)
    recordSecurityEvent('auth_success', { uid: fbUser.uid, email: fbUser.email })
    trackEvent('login', { method: fbUser.providerData?.[0]?.providerId || 'password' })
    try {
      const syncJob = async () => {
        if (hasData(useStore.getState().S)) {
          await pushState()
        }
        await pullState()
      }
      await Promise.race([
        syncJob(),
        new Promise(res => setTimeout(res, 1800))
      ])
    } catch { /* offline or first time */ }
    useUI.getState().toast(t('Welcome, {0}', userObj.name))

    // If the user signed in on a mobile browser (Google or Email), automatically launch the native Android app
    if (!MOBILE && isMobileBrowser && qs) {
      triggerNativeAppRedirect(qs)
    }

    nav('/profile')
  }

  useEffect(() => {
    const params = getMergedSearchParams(loc.search)
    const idToken = params.get('google_id_token') || ''
    const accessToken = params.get('google_access_token') || ''
    const incomingUid = params.get('uid') || ''
    const oobCode = params.get('oobCode') || ''
    const actionMode = params.get('mode') || ''

    // 1. Handle Google OAuth or Authenticated Session return from system browser into Android APK
    if (idToken || accessToken || incomingUid) {
      setBusy(true)
      setStatusBanner({ type: 'info', text: t('Completing Sign-In...') })

      const hydrateFromParams = () => {
        if (!incomingUid) return false
        const userObj = {
          id: incomingUid,
          name: params.get('name') || (params.get('email') ? params.get('email').split('@')[0] : 'Athlete'),
          email: params.get('email') || '',
          emailVerified: params.get('verified') === '1' || params.get('verified') === 'true',
          photoURL: params.get('photo') || '',
          admin: false,
          firebase: true
        }
        setUser(userObj)
        Promise.race([pullState(), new Promise(r => setTimeout(r, 1500))]).catch(() => {}).finally(() => {
          useUI.getState().toast(t('Welcome, {0}', userObj.name))
          nav('/profile')
        })
        return true
      }

      if (idToken || accessToken) {
        signInWithGoogleTokens(idToken, accessToken)
          .then(fbUser => applyFirebaseUser(fbUser))
          .catch(err => {
            if (!hydrateFromParams()) {
              const msg = err.message || t('Google sign-in failed')
              setStatusBanner({ type: 'error', text: msg })
              useUI.getState().toast(msg)
            }
          })
          .finally(() => setBusy(false))
      } else {
        hydrateFromParams()
        setBusy(false)
      }
      return
    }

    // 2. Handle direct Firebase action codes (verifyEmail / resetPassword)
    if (oobCode && actionMode === 'verifyEmail') {
      setBusy(true)
      setStatusBanner({ type: 'info', text: t('Verifying your email address...') })
      applyEmailVerificationCode(oobCode)
        .then(fbUser => {
          if (fbUser || useStore.getState().user) {
            const cur = useStore.getState().user
            if (cur) setUser({ ...cur, emailVerified: true, firebase: true })
          }
          setStatusBanner({ type: 'success', text: t('Email verified! You can now use your account.') })
          useUI.getState().toast(t('Email verified!'))
          if (!MOBILE && isMobileBrowser) {
            setNativeReturnUrl('smitrix://login?verified=true')
          }
        })
        .catch(err => {
          setStatusBanner({ type: 'error', text: err.message || t('Verification link expired or already used.') })
        })
        .finally(() => setBusy(false))
      return
    }

    if (oobCode && (actionMode === 'resetPassword' || actionMode === 'reset')) {
      setResetOobCode(oobCode)
      return
    }

    // 3. Handle post-verification or post-reset redirect flags
    if (params.get('verified') === 'true') {
      setStatusBanner({ type: 'success', text: t('Email verified! Your account is ready.') })
      useUI.getState().toast(t('Email verified!'))
      refreshCurrentUser().then(fbUser => {
        if (fbUser) {
          const cur = useStore.getState().user
          if (cur) setUser({ ...cur, emailVerified: !!fbUser.emailVerified, firebase: true })
        }
      }).catch(() => {})
      if (!MOBILE && isMobileBrowser) {
        setNativeReturnUrl('smitrix://login?verified=true')
      }
    } else if (actionMode === 'reset') {
      setStatusBanner({ type: 'info', text: t('Password reset complete. Sign in with your updated password.') })
      useUI.getState().toast(t('Please sign in with your updated credentials.'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.search])

  const handleConfirmPasswordReset = async e => {
    e?.preventDefault?.()
    if (!newResetPassword || newResetPassword.length < 6) {
      setStatusBanner({ type: 'error', text: t('Password must be at least 6 characters') })
      useUI.getState().toast(t('Password must be at least 6 characters'))
      return
    }
    setBusy(true)
    try {
      await completePasswordReset(resetOobCode, newResetPassword)
      setResetOobCode('')
      setNewResetPassword('')
      setStatusBanner({ type: 'success', text: t('Password updated! You can now sign in below.') })
      useUI.getState().toast(t('Password updated!'))
      if (!MOBILE && isMobileBrowser) {
        setNativeReturnUrl('smitrix://login?mode=reset')
      }
    } catch (err) {
      const msg = err.message || t('Failed to reset password. Link may have expired.')
      setStatusBanner({ type: 'error', text: msg })
      useUI.getState().toast(msg)
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setBusy(true)
    setStatusBanner(null)
    try {
      const fbUser = await signInWithGoogle()
      await applyFirebaseUser(fbUser)
    } catch (err) {
      if (err.code === 'auth/mobile-browser-redirect') {
        setStatusBanner({
          type: 'info',
          text: t('Complete Google Sign-In in your browser — it will return to SmiTriX automatically.')
        })
        useUI.getState().toast(t('Opening Google Sign-In in your browser...'))
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        recordSecurityEvent('auth_failure_google', { error: err.message })
        let msg = err.message
        if (err.code === 'auth/popup-blocked') {
          msg = t('Popup was blocked by your browser. Please allow popups or tap Continue with Google again.')
        } else if (err.code === 'auth/timeout') {
          msg = t('Google sign-in timed out. Please try again or use Email sign-in.')
        } else if (err.code === 'auth/network-request-failed') {
          msg = t('Network request failed. Please check your internet connection.')
        }
        setStatusBanner({ type: 'error', text: msg || t('Google sign-in failed') })
        useUI.getState().toast(msg || t('Google sign-in failed'))
      }
    } finally {
      setBusy(false)
    }
  }

  const handleEmailAuth = async e => {
    e?.preventDefault?.()
    setStatusBanner(null)
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = t('Enter a valid email address')
      setStatusBanner({ type: 'error', text: msg })
      useUI.getState().toast(msg)
      return
    }
    if (!password || password.length < 6) {
      const msg = t('Password must be at least 6 characters')
      setStatusBanner({ type: 'error', text: msg })
      useUI.getState().toast(msg)
      return
    }

    setBusy(true)
    try {
      const authTask = (mode === 'register')
        ? registerWithEmailPassword(cleanEmail, password, displayName.trim())
        : loginWithEmailPassword(cleanEmail, password)

      const timeoutTask = new Promise((_, reject) => {
        setTimeout(() => {
          const err = new Error(t('Authentication timed out. Please check your internet connection.'))
          err.code = 'auth/timeout'
          reject(err)
        }, 15000)
      })

      const fbUser = await Promise.race([authTask, timeoutTask])
      if (mode === 'register') {
        useUI.getState().toast(t('Account created! Verification email sent.'))
      }
      await applyFirebaseUser(fbUser)
    } catch (err) {
      recordSecurityEvent('auth_failure_email', { email: cleanEmail, mode, error: err.message })
      let msg = err.message
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = t('Invalid email or password.')
      } else if (err.code === 'auth/email-already-in-use') {
        msg = t('An account with this email already exists. Switch to Sign In.')
      } else if (err.code === 'auth/network-request-failed') {
        msg = t('Network request failed. Please check your connection.')
      } else if (err.code === 'auth/too-many-requests') {
        msg = t('Too many attempts. Please wait a moment or reset your password.')
      }
      setStatusBanner({ type: 'error', text: msg })
      useUI.getState().toast(msg)
    } finally {
      setBusy(false)
    }
  }

  const signInWithPasskey = async () => {
    try {
      const u = await passkeyLogin()
      setUser(u)
      await pullState()
      recordSecurityEvent('passkey_login_ok', { uid: u.id })
      useUI.getState().toast(t('Welcome back, {0}', u.name))
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        recordSecurityEvent('passkey_login_fail', { error: e.message })
        useUI.getState().toast(e.message || t('Sign-in failed'))
      }
    }
  }

  const head = (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <img
          src="icon-180.png"
          width="80"
          height="80"
          style={{
            borderRadius: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '1.5px solid rgba(255,255,255,0.08)'
          }}
          alt="SmiTriX"
        />
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.03em', margin: '10px 0 2px' }}>
        SmiTriX
      </h1>
      <div className="muted small" style={{ marginBottom: 24, letterSpacing: '.04em' }}>
        {t('Precision Workout Engine & Privacy Vault')}
      </div>
    </>
  )

  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '82vh',
    textAlign: 'center',
    padding: '20px 16px',
    maxWidth: 420,
    margin: '0 auto'
  }

  if (DEMO) {
    return (
      <div style={wrap}>
        {head}
        <div className="muted" style={{ marginBottom: 30 }}>{t('Live demo — everything stays in this browser.')}</div>
        <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
        <div className="card small muted" style={{ textAlign: 'left', marginTop: 16 }}>
          {t('This demo runs entirely in your browser on example data — nothing is sent anywhere.')}
        </div>
        <div className="dim small" style={{ marginTop: 22, lineHeight: 1.6 }}>
          <a href={REPO} target="_blank" rel="noopener">{t('Self-host it in a minute →')}</a>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      {canGoBack && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
          <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
            <Icon name="chevronLeft" />
          </button>
        </div>
      )}
      {head}

      {(!MOBILE && isMobileBrowser) && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: 14,
            padding: '12px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--blue)', display: 'flex' }}>
              <Icon name="link" size={18} />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label)' }}>
                {t('SmiTriX Mobile App')}
              </div>
              <div className="muted small" style={{ fontSize: 11 }}>
                {t('Open directly in the Android application')}
              </div>
            </div>
          </div>
          <a
            href={nativeReturnUrl || `smitrix://login${loc.search || window.location.search || ''}`}
            className="btn primary"
            style={{
              width: 'auto',
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {t('Open App')}
          </a>
        </div>
      )}

      {statusBanner && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            marginBottom: 16,
            textAlign: 'left',
            fontSize: 13,
            lineHeight: 1.45,
            background:
              statusBanner.type === 'error'
                ? 'rgba(255, 69, 58, 0.14)'
                : statusBanner.type === 'success'
                ? 'rgba(48, 209, 88, 0.14)'
                : 'rgba(10, 132, 255, 0.14)',
            border: `1px solid ${
              statusBanner.type === 'error'
                ? 'var(--red)'
                : statusBanner.type === 'success'
                ? 'var(--green)'
                : 'var(--blue)'
            }`,
            color: 'var(--label)'
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {statusBanner.text}
          </div>
          {nativeReturnUrl && (
            <div style={{ marginTop: 10 }}>
              <a
                href={nativeReturnUrl}
                className="btn primary"
                style={{
                  textDecoration: 'none',
                  padding: '10px 14px',
                  fontSize: 13,
                  borderRadius: 10
                }}
              >
                {t('Return to SmiTriX App')}
              </a>
            </div>
          )}
        </div>
      )}

      {resetOobCode ? (
        <div className="card" style={{ padding: '24px 20px', background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-hairline)', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{t('Set New Password')}</h3>
          <div className="muted small" style={{ marginBottom: 16 }}>
            {t('Enter a new password (at least 6 characters) for your SmiTriX account.')}
          </div>
          <form onSubmit={handleConfirmPasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="password"
              placeholder={t('New password (min. 6 characters)')}
              value={newResetPassword}
              onChange={e => setNewResetPassword(e.target.value)}
              required
              autoFocus
            />
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? t('Updating...') : t('Update Password')}
            </Button>
          </form>
        </div>
      ) : isNativeGoogleBridge ? (
        <div className="card" style={{ padding: '24px 20px', background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-hairline)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--label)' }}>
            {t('Google Sign-In for SmiTriX App')}
          </div>
          <div className="muted small" style={{ marginBottom: 18, lineHeight: 1.5 }}>
            {t('Tap below to select your Google account and automatically sign into the SmiTriX Android app.')}
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={handleGoogleSignIn}
            disabled={busy}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '13px 16px',
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 12
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ background: '#fff', borderRadius: '50%', padding: 2 }}>
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span>{busy ? t('Connecting to Google...') : t('Continue with Google')}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Mode Selector Segmented Control */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-2)',
              borderRadius: 14,
              padding: 4,
              marginBottom: 20,
              border: '1px solid var(--border-hairline)'
            }}
          >
            <button
              className={`btn ${mode === 'login' ? 'primary' : 'ghost'}`}
              style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600 }}
              onClick={() => { setMode('login'); setStatusBanner(null) }}
              type="button"
            >
              {t('Sign In')}
            </button>
            <button
              className={`btn ${mode === 'register' ? 'primary' : 'ghost'}`}
              style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600 }}
              onClick={() => { setMode('register'); setStatusBanner(null) }}
              type="button"
            >
              {t('Sign Up')}
            </button>
            <button
              className={`btn ${mode === 'passkey' ? 'primary' : 'ghost'}`}
              style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600 }}
              onClick={() => { setMode('passkey'); setStatusBanner(null) }}
              type="button"
            >
              {t('Passkey')}
            </button>
          </div>

          {mode === 'passkey' ? (
            <div className="card" style={{ padding: '24px 18px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--label)' }}>
                {t('Biometric & Hardware Passkeys')}
              </div>
              <div className="muted small" style={{ marginBottom: 20, lineHeight: 1.5 }}>
                {t('Hardware security keys and device biometrics ({0}). Fast, passwordless, self-host authenticated.', BIO)}
              </div>
              {webauthnOK() ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Button variant="primary" icon="person" onClick={signInWithPasskey}>
                    {t('Sign in with passkey')}
                  </Button>
                  <Button
                    icon="sparkles"
                    onClick={() => useUI.getState().openSheet(close => <PasskeyRegisterSheet close={close} />)}
                  >
                    {t('Create new profile')}
                  </Button>
                </div>
              ) : (
                <div className="dim small" style={{ textAlign: 'left', lineHeight: 1.5 }}>
                  {t("This browser doesn't support WebAuthn passkeys. Use Google or Email sign-in below.")}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: '24px 20px', background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-hairline)' }}>
              {/* 1-Click Google Sign-In */}
              <button
                type="button"
                className="btn"
                onClick={handleGoogleSignIn}
                disabled={busy}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '11px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 12
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>{mode === 'register' ? t('Sign up with Google') : t('Continue with Google')}</span>
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 16px', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
                <span className="dim small" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  {t('or email')}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mode === 'register' && (
                  <input
                    className="input"
                    type="text"
                    placeholder={t('Your athlete name')}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={40}
                    required
                  />
                )}

                <input
                  className="input"
                  type="email"
                  placeholder={t('Email address')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('Password (min. 6 characters)')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--label-3)',
                      cursor: 'pointer',
                      padding: 4
                    }}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                  </button>
                </div>

                {mode === 'login' && (
                  <div style={{ textAlign: 'right', marginTop: -4 }}>
                    <button
                      type="button"
                      onClick={() => useUI.getState().openSheet(close => <ForgotPasswordSheet close={close} initialEmail={email} />)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--blue)',
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {t('Forgot password?')}
                    </button>
                  </div>
                )}

                <div style={{ height: 4 }} />

                <Button variant="primary" type="submit" disabled={busy}>
                  {busy ? t('Processing...') : mode === 'register' ? t('Create Account') : t('Sign In')}
                </Button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Mandatory Account Assurance Badge */}
      {!isNativeGoogleBridge && !resetOobCode && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            fontSize: 12,
            color: 'var(--label-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <Icon name="shield" size={15} style={{ color: 'var(--acc)', flex: 'none' }} />
          <span>{t('Mandatory Athlete Account · Automatic Cloud Sync & PR Backup')}</span>
        </div>
      )}

      <div className="dim small" style={{ marginTop: 22, lineHeight: 1.5, fontSize: 11 }}>
        {t('Protected by multi-layer authentication and client-side encryption.')}
      </div>
    </div>
  )
}
