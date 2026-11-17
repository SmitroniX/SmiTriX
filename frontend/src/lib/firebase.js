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

export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyBBx1br3I7TcQ3JF46_Cmwwxjh4LVXc_5Y",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "aniplex-b74b5.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "aniplex-b74b5",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "aniplex-b74b5.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "959848366624",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:959848366624:web:2128ddde265c405523b245",
  measurementId: "G-QF7MCSBRT8"
}

// Singleton app instance
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const firestore = getFirestore(app)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

/**
 * Creates user document record in Firestore upon auth
 */
export async function syncUserProfile(firebaseUser, extra = {}) {
  if (!firebaseUser?.uid) return
  try {
    const userRef = doc(firestore, 'users', firebaseUser.uid)
    const snap = await getDoc(userRef)
    const base = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || extra.name || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Athlete'),
      photoURL: firebaseUser.photoURL || '',
      emailVerified: !!firebaseUser.emailVerified,
      updatedAt: Date.now(),
      lastLogin: Date.now()
    }
    if (!snap.exists()) {
      base.createdAt = Date.now()
      base.plan = 'free'
      base.analyticsOptIn = true
    }
    await setDoc(userRef, base, { merge: true })
  } catch (err) {
    console.warn('syncUserProfile silent note:', err.message)
  }
}

/**
 * Register with Email & Password
 */
export async function registerWithEmailPassword(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() })
  }
  try {
    await sendEmailVerification(cred.user)
  } catch (e) {
    console.warn('Verification email send error:', e.message)
  }
  await syncUserProfile(cred.user, { name: displayName })
  return cred.user
}

/**
 * Login with Email & Password
 */
export async function loginWithEmailPassword(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  await syncUserProfile(cred.user)
  return cred.user
}

/**
 * Google Sign-In
 */
export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  await syncUserProfile(cred.user)
  return cred.user
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email.trim())
}

/**
 * Resend Email Verification
 */
export async function resendVerificationEmail() {
  if (auth.currentUser) {
    return sendEmailVerification(auth.currentUser)
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
