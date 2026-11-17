import { collection, addDoc } from 'firebase/firestore'
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
