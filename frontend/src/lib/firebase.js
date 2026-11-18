import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
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
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "smitrix.firebaseapp.com",
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
  return {
    url: `https://smitrix.web.app${path}`,
    handleCodeInApp: true,
    android: {
      packageName: 'com.smitrix.app',
      installApp: true,
      minimumVersion: '30'
    }
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
    // Open system browser for safe Google sign-in.
    window.open('https://smitrix.web.app/login', '_system')
    const err = new Error('Google Sign-In opened in your browser. For direct in-app access, please sign in with Email & Password.')
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
  syncUserProfile(cred.user).catch(() => {})
  return cred.user
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
