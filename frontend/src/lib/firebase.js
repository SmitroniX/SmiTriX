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
  getDocs,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'

export const ADMIN_EMAIL = 'smitronix0826@gmail.com'
export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL
}

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
        admin: isAdminEmail(firebaseUser.email),
        updatedAt: Date.now(),
        lastLogin: Date.now()
      }
      await setDoc(userRef, base, { merge: true }).catch(() => {})
      const mirrorRef = doc(firestore, 'workout_posts', 'cloud_user_' + firebaseUser.uid)
      await setDoc(mirrorRef, {
        ...base,
        recordType: 'user_cloud_summary'
      }, { merge: true }).catch(() => {})
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
    const targetUrl = 'https://smitrix.web.app/login?native_google=1&v=2#/login?native_google=1'
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
    if (cred.user) {
      cred.user._oauthIdToken = oauthCred?.idToken || cred?._tokenResponse?.oauthIdToken || ''
      cred.user._oauthAccessToken = oauthCred?.accessToken || cred?._tokenResponse?.oauthAccessToken || ''
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
 * Push workout state S to Cloud Firestore (/users/{uid}/data/state + cloud mirror)
 */
export async function pushCloudState(uid, state, userMeta = null) {
  if (!uid || !state) return false
  const task = async () => {
    const now = Date.now()
    const stateJson = JSON.stringify(state)
    const workouts = state.workouts || []
    const routines = state.routines || []
    const bodyweight = state.bodyweight || []
    const totalVolume = workouts.reduce((sum, w) => {
      const wVol = (w.entries || []).reduce(
        (s1, e) => s1 + (e.sets || []).filter(s => s.done).reduce((s2, s) => s2 + (Number(s.w) || 0) * (Number(s.r) || 0), 0),
        0
      )
      return sum + (w.vol || wVol || 0)
    }, 0)

    const ref = doc(firestore, 'users', uid, 'data', 'state')
    await setDoc(ref, {
      stateJson,
      updatedAt: now
    }, { merge: true }).catch(() => {})

    const mirrorRef = doc(firestore, 'workout_posts', 'cloud_user_' + uid)
    const metaPayload = {
      recordType: 'user_cloud_summary',
      uid,
      name: userMeta?.name || state.athleteProfile?.name || auth?.currentUser?.displayName || 'Athlete',
      email: userMeta?.email || auth?.currentUser?.email || '',
      photoURL: state.athleteProfile?.photoURL || userMeta?.photoURL || auth?.currentUser?.photoURL || '',
      emailVerified: !!(userMeta?.emailVerified ?? auth?.currentUser?.emailVerified),
      admin: isAdminEmail(userMeta?.email || auth?.currentUser?.email),
      tier: state.tier || 'free',
      unit: state.unit || 'kg',
      workoutCount: workouts.length,
      routineCount: routines.length,
      bodyweightCount: bodyweight.length,
      totalVolume: Math.round(totalVolume),
      lastWorkoutDate: workouts[workouts.length - 1]?.d || null,
      stateJson,
      updatedAt: now
    }
    await setDoc(mirrorRef, metaPayload, { merge: true }).catch(() => {})
    return true
  }
  return Promise.race([
    task(),
    new Promise(resolve => setTimeout(() => resolve(false), 3500))
  ])
}

/**
 * Pull workout state S from Cloud Firestore (/users/{uid}/data/state with cloud mirror fallback)
 */
export async function pullCloudState(uid) {
  if (!uid) return null
  const task = async () => {
    try {
      const ref = doc(firestore, 'users', uid, 'data', 'state')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        if (data?.stateJson) return JSON.parse(data.stateJson)
        if (data?.state) return data.state
      }
    } catch {}
    try {
      const mirrorRef = doc(firestore, 'workout_posts', 'cloud_user_' + uid)
      const mirrorSnap = await getDoc(mirrorRef)
      if (mirrorSnap.exists()) {
        const mData = mirrorSnap.data()
        if (mData?.stateJson) return JSON.parse(mData.stateJson)
      }
    } catch {}
    return null
  }
  return Promise.race([
    task(),
    new Promise(resolve => setTimeout(() => resolve(null), 3000))
  ])
}

/**
 * Submit a Bug Report / Issue directly to Cloud Firestore for the Website Admin Dashboard
 */
export async function submitCloudBugReport({
  title,
  description,
  category = 'bug',
  severity = 'medium',
  screenshotDataUrl = '',
  user = null,
  appVersion = '1.7.4',
  route = ''
}) {
  const cleanTitle = String(title || '').trim().slice(0, 140)
  const cleanDesc = String(description || '').trim().slice(0, 2000)
  if (!cleanTitle && !cleanDesc) throw new Error('Please describe the bug or issue')
  const reportId = 'bug_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
  const now = Date.now()
  const payload = {
    id: reportId,
    recordType: 'bug_report',
    title: cleanTitle || cleanDesc.slice(0, 60),
    description: cleanDesc || cleanTitle,
    category,
    severity,
    status: 'open',
    screenshotDataUrl: screenshotDataUrl || '',
    uid: user?.id || auth?.currentUser?.uid || 'anonymous',
    userName: user?.name || auth?.currentUser?.displayName || 'Athlete',
    userEmail: user?.email || auth?.currentUser?.email || '',
    appVersion,
    route: route || (typeof window !== 'undefined' ? window.location.hash || window.location.pathname : ''),
    device: typeof navigator !== 'undefined' ? (navigator.userAgent || 'unknown').slice(0, 180) : 'unknown',
    createdAt: now,
    updatedAt: now
  }
  const ref = doc(firestore, 'workout_posts', reportId)
  await setDoc(ref, payload)
  // Also append to feedback collection for redundancy
  try {
    await addDoc(collection(firestore, 'feedback'), {
      message: `[${category.toUpperCase()} · ${severity.toUpperCase()}] ${payload.title}: ${payload.description}`,
      rating: severity === 'high' ? 1 : severity === 'medium' ? 3 : 4,
      category: 'bug_' + category,
      timestamp: now,
      uid: payload.uid
    })
  } catch {}
  return payload
}

/**
 * Update a Bug Report's status or admin resolution note in Cloud Firestore
 */
export async function updateCloudBugReport(reportId, patch) {
  if (!reportId) return
  const ref = doc(firestore, 'workout_posts', reportId)
  await setDoc(ref, { ...patch, updatedAt: Date.now() }, { merge: true })
}

/**
 * Delete a document from workout_posts (bug report, photo post, or user summary)
 */
export async function deleteCloudRecord(docId) {
  if (!docId) return
  const ref = doc(firestore, 'workout_posts', docId)
  await deleteDoc(ref)
}

/**
 * Fetch all Cloud Users, Bug Reports, Workout Photo Posts, and Subscriptions for the Website Admin Dashboard
 */
export async function fetchAdminCloudDashboard() {
  const users = []
  const bugReports = []
  const photoPosts = []
  const subscriptions = []

  try {
    const wpSnap = await getDocs(collection(firestore, 'workout_posts'))
    wpSnap.forEach(d => {
      const data = { id: d.id, ...d.data() }
      if (data.recordType === 'user_cloud_summary' || d.id.startsWith('cloud_user_')) {
        let parsedState = null
        if (data.stateJson) {
          try { parsedState = JSON.parse(data.stateJson) } catch {}
        }
        users.push({
          ...data,
          uid: data.uid || d.id.replace(/^cloud_user_/, ''),
          state: parsedState
        })
      } else if (data.recordType === 'bug_report' || d.id.startsWith('bug_')) {
        bugReports.push(data)
      } else {
        photoPosts.push(data)
      }
    })
  } catch (e) {
    console.warn('Admin workout_posts fetch note:', e.message)
  }

  // Also include the currently signed-in user if not yet in the list
  if (auth?.currentUser) {
    const curUid = auth.currentUser.uid
    if (!users.some(u => u.uid === curUid)) {
      users.push({
        uid: curUid,
        name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Admin',
        email: auth.currentUser.email || '',
        photoURL: auth.currentUser.photoURL || '',
        emailVerified: !!auth.currentUser.emailVerified,
        admin: isAdminEmail(auth.currentUser.email),
        tier: 'legacy',
        workoutCount: 0,
        routineCount: 0,
        bodyweightCount: 0,
        totalVolume: 0,
        updatedAt: Date.now()
      })
    }
  }

  try {
    const subSnap = await getDocs(collection(firestore, 'subscriptions'))
    subSnap.forEach(d => {
      subscriptions.push({ id: d.id, ...d.data() })
    })
  } catch (e) {
    console.warn('Admin subscriptions fetch note:', e.message)
  }

  users.sort((a, b) => (b.updatedAt || b.lastLogin || 0) - (a.updatedAt || a.lastLogin || 0))
  bugReports.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  photoPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  subscriptions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return { users, bugReports, photoPosts, subscriptions }
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
