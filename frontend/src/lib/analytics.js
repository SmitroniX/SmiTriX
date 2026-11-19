import { collection, addDoc, doc, setDoc } from 'firebase/firestore'
import { firestore, auth } from './firebase.js'

const CONSENT_STORAGE_KEY = 'smitrix_analytics_consent'
let sessionAnonymousId = null

function getAnonymousSessionId() {
  if (!sessionAnonymousId) {
    try {
      sessionAnonymousId = sessionStorage.getItem('smitrix_anon_sess')
      if (!sessionAnonymousId) {
        sessionAnonymousId = 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
        sessionStorage.setItem('smitrix_anon_sess', sessionAnonymousId)
      }
    } catch {
      sessionAnonymousId = 'sess_' + Date.now().toString(36)
    }
  }
  return sessionAnonymousId
}

/**
 * Check if the user has consented to analytics collection.
 * Default is opt-in with full user toggle control in Profile/Settings.
 */
export function hasAnalyticsConsent() {
  try {
    if (typeof localStorage === 'undefined') return true
    const val = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (val === '0' || val === 'false') return false
    return true
  } catch {
    return true
  }
}

/**
 * Update user analytics privacy preference.
 */
export function setAnalyticsConsent(enabled) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(CONSENT_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

/**
 * Strip sensitive strings or credentials before transmitting telemetry.
 */
function sanitizePayload(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const clean = {}
  for (const [k, v] of Object.entries(obj)) {
    // Drop potential passwords, tokens or long strings
    if (/password|token|secret|auth|bearer/i.test(k)) continue
    if (typeof v === 'string') {
      clean[k] = v.slice(0, 300)
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      clean[k] = v
    } else if (Array.isArray(v)) {
      clean[k] = v.slice(0, 10).map(x => (typeof x === 'object' ? sanitizePayload(x) : String(x).slice(0, 100)))
    }
  }
  return clean
}

/**
 * Track an application event or interaction metric.
 */
export async function trackEvent(eventName, properties = {}) {
  if (!hasAnalyticsConsent()) return
  try {
    const col = collection(firestore, 'analytics_events')
    const uid = auth?.currentUser?.uid || null
    await addDoc(col, {
      event: String(eventName).slice(0, 80),
      timestamp: Date.now(),
      uid,
      sessionId: getAnonymousSessionId(),
      device: typeof navigator !== 'undefined' ? (navigator.userAgentData?.platform || navigator.platform || 'unknown') : 'unknown',
      props: sanitizePayload(properties)
    })
  } catch (err) {
    // Fail silently so telemetry never interferes with application flow
    console.debug('telemetry capture note:', err.message)
  }
}

/**
 * Track feature usage specifically.
 */
export function trackFeature(featureName, details = {}) {
  return trackEvent(`feature:${featureName}`, details)
}

/**
 * Report client crash or unhandled error.
 */
export async function reportCrash(error, context = {}) {
  try {
    const col = collection(firestore, 'crash_reports')
    const message = error?.message ? String(error.message).slice(0, 2000) : String(error).slice(0, 2000)
    const stack = error?.stack ? String(error.stack).slice(0, 3000) : null
    await addDoc(col, {
      message,
      stack,
      timestamp: Date.now(),
      uid: auth?.currentUser?.uid || null,
      sessionId: getAnonymousSessionId(),
      path: typeof window !== 'undefined' ? window.location?.hash || window.location?.pathname : '',
      context: sanitizePayload(context)
    })
  } catch (err) {
    console.debug('crash reporting note:', err.message)
  }
}

/**
 * Record authentication and security events.
 */
export async function recordSecurityEvent(type, details = {}) {
  try {
    const col = collection(firestore, 'security_events')
    await addDoc(col, {
      type: String(type).slice(0, 60),
      timestamp: Date.now(),
      uid: auth?.currentUser?.uid || null,
      details: sanitizePayload(details)
    })
  } catch (err) {
    console.debug('security audit note:', err.message)
  }
}

/**
 * Submit user feedback with category and rating.
 */
export async function submitUserFeedback({ message, rating = 5, category = 'general' }) {
  const col = collection(firestore, 'feedback')
  const cleanMsg = String(message || '').trim().slice(0, 1000)
  if (!cleanMsg) throw new Error('Feedback message is required')

  await addDoc(col, {
    message: cleanMsg,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    category: String(category).slice(0, 40),
    timestamp: Date.now(),
    uid: auth?.currentUser?.uid || null,
    email: auth?.currentUser?.email || null
  })
  return true
}

/**
 * Measure performance execution metrics.
 */
export function measurePerformance(metricName, durationMs, metadata = {}) {
  if (durationMs > 100) { // Only log significant durations to avoid noise
    trackEvent('perf_metric', { metric: metricName, durationMs: Math.round(durationMs), ...metadata })
  }
}

/**
 * Sync structured customer telemetry & product usage insights to Cloud Firestore
 * (`customer_insights/{uid}`) so product usage, exercise frequency, and plan metrics
 * can be queried to continuously improve the application.
 */
export async function syncCustomerInsights(user, S) {
  if (!hasAnalyticsConsent()) return false
  const uid = user?.id || auth?.currentUser?.uid
  if (!uid || !S) return false
  try {
    const workouts = S.workouts || []
    const exCounts = {}
    let totalSets = 0
    let totalVolume = 0
    for (const w of workouts) {
      for (const e of w.entries || []) {
        if (e.id) exCounts[e.id] = (exCounts[e.id] || 0) + 1
        for (const s of e.sets || []) {
          if (s.done) {
            totalSets += 1
            totalVolume += (Number(s.w) || 0) * (Number(s.r) || 0)
          }
        }
      }
    }
    const topExercises = Object.entries(exCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({ id, count }))

    const ref = doc(firestore, 'customer_insights', String(uid))
    await setDoc(ref, {
      uid: String(uid),
      email: user?.email || auth?.currentUser?.email || '',
      name: user?.name || auth?.currentUser?.displayName || 'Athlete',
      tier: S.tier || 'free',
      bodyType: S.athleteProfile?.bodyType || 'mesomorph',
      goal: S.athleteProfile?.goal || 'Hypertrophy',
      unit: S.unit || 'kg',
      workoutCount: workouts.length,
      totalSets,
      totalVolume: Math.round(totalVolume),
      routineCount: (S.routines || []).length,
      favCount: (S.favEx || []).length,
      photoPostCount: (S.workoutPosts || []).length,
      topExercises,
      appVersion: '1.7.0',
      updatedAt: Date.now()
    }, { merge: true })
    return true
  } catch (err) {
    console.debug('syncCustomerInsights note:', err.message)
    return false
  }
}

/**
 * Sync a Hevy-style workout photo post to Cloud Firestore (`workout_posts/{postId}`).
 */
export async function syncWorkoutPostToCloud(user, post) {
  const uid = user?.id || auth?.currentUser?.uid
  if (!uid || !post?.id) return false
  try {
    const ref = doc(firestore, 'workout_posts', String(post.id))
    await setDoc(ref, {
      ...post,
      uid: String(uid),
      athleteName: user?.name || post.athleteName || 'Athlete',
      syncedAt: Date.now()
    }, { merge: true })
    return true
  } catch (err) {
    console.debug('syncWorkoutPostToCloud note:', err.message)
    return false
  }
}
