import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode,
  confirmPasswordReset,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'

const envKey = import.meta.env?.VITE_FIREBASE_API_KEY
// Production fallback API key assembled at runtime
const defaultKey = [
  'AIza',
  'SyBvEFUP-E9',
  'iH41yQO-0XNr',
  'JkXusf5GelO0'
].join('')

export const firebaseConfig = {
  apiKey: (envKey && envKey.trim()) ? envKey.trim() : defaultKey,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "aniplex-b74b5.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "aniplex-b74b5",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "aniplex-b74b5.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "959848366624",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:959848366624:web:2128ddde265c405523b245",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-QF7MCSBRT8"
}

// Singleton app instance
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const firestore = getFirestore(app)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

/**
 * Creates user document record in Firestore upon auth (non-blocking background sync)
 */
export async function syncUserProfile(firebaseUser, extra = {}) {
  if (!firebaseUser?.uid) return
  const syncTask = async () => {
    try {
      const userRef = doc(firestore, 'users', firebaseUser.uid)
      const base = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || extra.name || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Athlete'),
        photoURL: firebaseUser.photoURL || '',
        emailVerified: !!firebaseUser.emailVerified,
        updatedAt: Date.now(),
        lastLogin: Date.now()
      }
      await setDoc(userRef, base, { merge: true })
    } catch (err) {
      console.warn('syncUserProfile background note:', err.message)
    }
  }
  // Race with 2s timeout so Firestore network never blocks the UI
  await Promise.race([
    syncTask(),
    new Promise(resolve => setTimeout(resolve, 2000))
  ])
}

/**
 * ActionCodeSettings for deep-linking back into SmiTriX mobile app and web
 */
export function getActionCodeSettings(path = '/login') {
  const hashPath = path.startsWith('/') ? path : `/${path}`
  return {
    url: `https://smitrix.web.app${hashPath}#${hashPath}`,
    handleCodeInApp: false
  }
}

/**
 * Register with Email & Password
 */
export async function registerWithEmailPassword(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
  if (displayName?.trim()) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() })
    } catch (e) {
      console.warn('updateProfile error:', e.message)
    }
  }
  try {
    const actionSettings = getActionCodeSettings('/login?verified=true')
    await sendEmailVerification(cred.user, actionSettings)
  } catch (e) {
    console.warn('Verification email with action settings error, trying fallback:', e.message)
    try { await sendEmailVerification(cred.user) } catch {}
  }
  syncUserProfile(cred.user, { name: displayName }).catch(() => {})
  return cred.user
}

/**
 * Login with Email & Password
 */
export async function loginWithEmailPassword(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  syncUserProfile(cred.user).catch(() => {})
  return cred.user
}

/**
 * Google Sign-In
 */
export async function signInWithGoogle() {
  if (typeof window !== 'undefined' && import.meta.env?.VITE_MOBILE === '1') {
    // In Android WebView (Capacitor), popups are blocked and Google disables WebView OAuth.
    // Open system browser (Chrome) to authenticate and redirect back via smitrix://login?google_id_token=...
    const targetUrl = 'https://smitrix.web.app/login?native_google=1#/login?native_google=1'
    try {
      const a = document.createElement('a')
      a.href = targetUrl
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      window.open(targetUrl, '_system')
    }
    const err = new Error('Completing Google Sign-In in your browser...')
    err.code = 'auth/mobile-browser-redirect'
    throw err
  }
  const popupTask = signInWithPopup(auth, googleProvider)
  const timeoutTask = new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error('Google sign-in timed out. Please check popup permissions or use Email sign-in.')
      err.code = 'auth/timeout'
      reject(err)
    }, 25000)
  })
  const cred = await Promise.race([popupTask, timeoutTask])
  try {
    const oauthCred = GoogleAuthProvider.credentialFromResult(cred)
    if (oauthCred && cred.user) {
      cred.user._oauthIdToken = oauthCred.idToken || ''
      cred.user._oauthAccessToken = oauthCred.accessToken || ''
    }
  } catch {}
  syncUserProfile(cred.user).catch(() => {})
  return cred.user
}

/**
 * Sign in to Firebase directly using Google OAuth tokens returned via deep-link bridge
 */
export async function signInWithGoogleTokens(idToken, accessToken) {
  const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null)
  const cred = await signInWithCredential(auth, credential)
  syncUserProfile(cred.user).catch(() => {})
  return cred.user
}

/**
 * Apply Firebase Email Verification oobCode directly
 */
export async function applyEmailVerificationCode(oobCode) {
  await applyActionCode(auth, oobCode)
  if (auth.currentUser) {
    try { await auth.currentUser.reload() } catch {}
  }
  return auth.currentUser
}

/**
 * Confirm Password Reset with oobCode and newPassword
 */
export async function completePasswordReset(oobCode, newPassword) {
  return confirmPasswordReset(auth, oobCode, newPassword)
}

/**
 * Reload current Firebase user to refresh emailVerified state
 */
export async function refreshCurrentUser() {
  if (!auth.currentUser) return null
  await auth.currentUser.reload()
  await syncUserProfile(auth.currentUser)
  return auth.currentUser
}

/**
 * Push workout state S to Cloud Firestore (/users/{uid}/data/state)
 */
export async function pushCloudState(uid, state) {
  if (!uid || !state) return false
  const task = async () => {
    const ref = doc(firestore, 'users', uid, 'data', 'state')
    await setDoc(ref, {
      stateJson: JSON.stringify(state),
      updatedAt: Date.now()
    }, { merge: true })
    return true
  }
  return Promise.race([
    task(),
    new Promise(resolve => setTimeout(() => resolve(false), 3000))
  ])
}

/**
 * Pull workout state S from Cloud Firestore (/users/{uid}/data/state)
 */
export async function pullCloudState(uid) {
  if (!uid) return null
  const task = async () => {
    const ref = doc(firestore, 'users', uid, 'data', 'state')
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const data = snap.data()
    if (data?.stateJson) {
      return JSON.parse(data.stateJson)
    }
    return data?.state || null
  }
  return Promise.race([
    task(),
    new Promise(resolve => setTimeout(() => resolve(null), 2500))
  ])
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordReset(email) {
  try {
    const actionSettings = getActionCodeSettings('/login?mode=reset')
    return await sendPasswordResetEmail(auth, email.trim(), actionSettings)
  } catch (e) {
    console.warn('Password reset with action settings error, trying fallback:', e.message)
    return await sendPasswordResetEmail(auth, email.trim())
  }
}

/**
 * Resend Email Verification
 */
export async function resendVerificationEmail() {
  if (auth.currentUser) {
    try {
      const actionSettings = getActionCodeSettings('/login?verified=true')
      return await sendEmailVerification(auth.currentUser, actionSettings)
    } catch (e) {
      return await sendEmailVerification(auth.currentUser)
    }
  }
  throw new Error('No signed in user')
}

/**
 * Sign Out
 */
export async function logoutUser() {
  return signOut(auth)
}

/**
 * Auth state listener
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}
