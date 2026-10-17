// Where the phone keeps the user's own API key: the platform's secure storage — the Keychain on
// iOS, the Keystore-backed EncryptedSharedPreferences on Android — and nowhere else. Never in
// S (which syncs and exports), never in localStorage (which the WebView evicts and any page on
// the same origin can read), never in the coach device file next to it.
//
// The plugin is imported lazily and every call is wrapped: on a plain web dev run it stores
// to localStorage by its own admission, and in a test there is no platform at all. In both
// cases the fallback is a process-local map that forgets on reload, which is the honest
// behaviour for a place that cannot keep a secret.
import { MOBILE } from './mobile.js'

const KEY = 'coach.apiKey'
const KEY_HEVY = 'hevy.apiKey'
const memory = new Map()

function localGet(k) {
  try { return typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage.getItem(k) : null } catch { return null }
}
function localSet(k, v) {
  try { if (typeof globalThis.localStorage !== 'undefined') globalThis.localStorage.setItem(k, v) } catch { /* ignore */ }
}
function localRemove(k) {
  try { if (typeof globalThis.localStorage !== 'undefined') globalThis.localStorage.removeItem(k) } catch { /* ignore */ }
}

let pluginPromise = null
function plugin() {
  if (!MOBILE) return Promise.resolve(null)
  if (!pluginPromise) {
    pluginPromise = import('@aparajita/capacitor-secure-storage')
      .then(m => {
        const s = m && m.SecureStorage
        if (!s || typeof s.get !== 'function') return null
        return {
          get: (k) => s.get(k),
          set: (k, v) => s.set(k, v),
          remove: (k) => s.remove(k),
        }
      })
      .catch(() => null)
  }
  return pluginPromise
}

// A native call that never answers must not hang the setup screen behind a greyed-out button
// (issue #42: "Save and use the Coach" stayed disabled forever on one Android 16 phone). After
// this long the platform store is treated as unavailable and the process-local map takes over.
const NATIVE_TIMEOUT_MS = 4000
export const withTimeout = (promise, ms = NATIVE_TIMEOUT_MS) => new Promise((resolve, reject) => {
  const tm = setTimeout(() => reject(new Error('secure storage timed out')), ms)
  promise.then(v => { clearTimeout(tm); resolve(v) }, e => { clearTimeout(tm); reject(e) })
})

function providerKey(provider) {
  return provider ? `coach.apiKey.${provider}` : KEY
}

export async function getApiKey(provider = null) {
  const p = await plugin()
  if (provider) {
    const pk = providerKey(provider)
    if (p) {
      try { const v = await withTimeout(p.get(pk)); if (typeof v === 'string' && v) return v } catch { /* fall through */ }
    }
    return memory.get(pk) || localGet(pk) || null
  }
  if (p) {
    try { const v = await withTimeout(p.get(KEY)); return typeof v === 'string' && v ? v : null } catch { /* fall through */ }
  }
  return memory.get(KEY) || localGet(KEY) || null
}

export async function setApiKey(value, provider = null) {
  const v = String(value || '').trim()
  if (!v) return clearApiKey(provider)
  const p = await plugin()
  const pk = providerKey(provider)
  if (p) {
    try {
      await withTimeout(p.set(pk, v))
      memory.delete(pk)
      localRemove(pk)
      if (provider) {
        await withTimeout(p.set(KEY, v))
        memory.delete(KEY)
        localRemove(KEY)
      }
      return
    } catch { /* fall through */ }
  }
  memory.set(pk, v)
  localSet(pk, v)
  if (provider) {
    memory.set(KEY, v)
    localSet(KEY, v)
  }
}

export async function clearApiKey(provider = null) {
  const p = await plugin()
  const pk = providerKey(provider)
  const isGeneralActive = provider && (
    (memory.get(KEY) && memory.get(KEY) === memory.get(pk)) ||
    (localGet(KEY) && localGet(KEY) === localGet(pk))
  )

  if (p) {
    try { await withTimeout(p.remove(pk)) } catch { /* nothing to clear */ }
    if (!provider || isGeneralActive) {
      try { await withTimeout(p.remove(KEY)) } catch { /* nothing to clear */ }
    }
  }
  memory.delete(pk)
  localRemove(pk)
  if (!provider || isGeneralActive) {
    memory.delete(KEY)
    localRemove(KEY)
  }
}

export async function hasApiKey(provider = null) {
  const k = await getApiKey(provider)
  return !!k
}

export async function getHevyApiKey() {
  const p = await plugin()
  if (p) {
    try { const v = await withTimeout(p.get(KEY_HEVY)); return typeof v === 'string' && v ? v : null } catch { /* fall through */ }
  }
  return memory.get(KEY_HEVY) || localGet(KEY_HEVY) || null
}
export async function setHevyApiKey(value) {
  const v = String(value || '').trim()
  if (!v) return clearHevyApiKey()
  const p = await plugin()
  if (p) {
    try { await withTimeout(p.set(KEY_HEVY, v)); memory.delete(KEY_HEVY); localRemove(KEY_HEVY); return } catch { /* fall through */ }
  }
  memory.set(KEY_HEVY, v)
  localSet(KEY_HEVY, v)
}
export async function clearHevyApiKey() {
  const p = await plugin()
  if (p) { try { await withTimeout(p.remove(KEY_HEVY)) } catch { /* nothing to clear */ } }
  memory.delete(KEY_HEVY)
  localRemove(KEY_HEVY)
}


