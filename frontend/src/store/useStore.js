import { create } from 'zustand'
import { api, setRemoteAuth } from '../lib/api.js'
import { localTZ } from '../lib/format.js'
import { registerCustom } from '../lib/exercises.js'
import { DEMO, DEMO_SEEDED } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { MOBILE, initReminderSync, nativeLoad, nativeSave, syncReminder, writeAutoBackup } from '../lib/mobile.js'
import { loadRemote, chooseLocal, forgetRemote, connect } from '../lib/remote.js'
import { loadCoachDevice, saveCoachDevice, coachDeviceSettings } from '../lib/coach-device.js'
import { enqueuePushState, clearQueue, flushSyncQueue } from '../lib/sync-queue.js'

import { WC_DEFAULT } from '../lib/workout-controls.js'

const KEY = 'gym_state_v1'
export const DEF = {
  unit: 'kg', restSec: 90, restPauseSec: 15, sound: true, restChime: 'bell', voiceCoach: false, timerFlash: false, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'peach', body: 'male', targetW: null,
  bgPattern: 'dots', bgPhoto: '', bgDim: 0.55, heatTone: 'ember',
  weeklyTarget: 4, daysOff: [],
  scheduleMode: 'week', rotationSteps: [], rotationStep: 0,
  startCountdownSec: 0, restGlow: true,
  deloadEveryWeeks: 0, deloadPct: 20,
  measures: [], customMeasures: [], measureEveryDays: 0,
  notes: [], noteFolders: [],
  progressShots: [], photoEveryDays: 0,
  moments: [],
  circuits: [],
  nutritionOn: true,
  nutrition: {
    goals: { kcal: 2400, protein: 160, carbs: 260, fat: 75, waterMl: 2500 },
    entries: {},
    water: {},
    shakes: {},
    supplements: [],
    suppTaken: {},
    customFoods: [],
    dishes: [],
    favFoods: [],
    mealPlans: [],
    mealPrep: [],
    fasting: null,
    trackers: { calories: true, water: true, shake: true, supplements: true, fasting: true, prep: true, plans: true },
  },
  recoveryOn: true,
  recovery: { entries: [], heatGoalMin: 45, coldGoalMin: 11 },
  awardsSeen: [], awardsWonAt: {},
  profileBanner: '', profileBadge: 'blue',
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  // How the active workout is laid out — 'cards' (one exercise at a time with Prev/Next)
  // or 'list' (every exercise stacked and scrollable). Purely presentational: profiles
  // written before this setting existed overlay onto DEF and keep the 'cards' behaviour.
  workoutView: 'cards',
  // Active workout spacing density: 'spacious' (generous touch targets) or 'compact' (dense display)
  workoutDensity: 'spacious',
  // Which controls the workout screen shows besides the sets themselves. The default is the
  // lean layout: one "more" button per exercise and a menu on each set number. Every switch
  // brings one of the old always-visible button groups back (Settings → During a workout).
  wc: { ...WC_DEFAULT },
  // effort: which per-set effort scale is logged — 'none' | 'rir' | 'rpe'. null, not 'none', so
  // that a profile which never chose (loaded state is overlaid on DEF, on every path: local,
  // server pull, backup import) still falls back to the `showRir` boolean this replaced and
  // keeps the column it had. See effortOf.
  reminder: { on: false, time: '08:00', tz: null }, effort: null, autoBackup: false,
  // Equipment profiles (issue: filter Library/picker/routines by what you actually own —
  // e.g. "Home" vs "Gym" — building on the session-only equipment filter from issue #6).
  equipProfiles: [], activeEquipId: null, equipFilterOn: false,
  // Standing per-exercise notes, keyed by exercise id: the gym-specific facts that are true
  // every time you do the movement ("seat 4, pin 7"). Distinct from a routine's `note`, which
  // belongs to one exercise in one plan, and from a session note, which belongs to one day.
  exNotes: {},
  // Favourite exercise ids (issue #6) — sorted to the top of the picker/Library. Personal, so
  // it syncs with the profile but is never part of a shared plan bundle (lib/favourites.js).
  favEx: [],
  // First day of the week as a getDay() index — 1 Monday, 0 Sunday. Monday is the default so
  // every profile written before this setting existed keeps the week it has been looking at.
  // See lib/format.js: nothing reads this field directly, everything goes through the helpers.
  weekStart: 1,
  // Per-exercise bar weight overrides, keyed by exercise id, in the profile unit (see
  // lib/bar.js). Personal equipment, so it syncs with the account but never travels in a
  // shared plan. Logged weights stay the total — this only feeds the plate math.
  barWeights: {},
  // Gym check-in cards (see views/CheckIn.jsx). Each is a membership
  // code shown as a QR/barcode at the gym's turnstile — added by typing it, importing a photo
  // of the card, or scanning it. We only ever keep the code's VALUE, never a photo: the image
  // is regenerated from `value` every time it's shown (lib/qr.js). `fmt` is the barcode symbology
  // ('qrcode' | 'ean13' | 'code128' | … — lower-cased BarcodeFormat) so it renders as the same
  // kind of code the gym issued. Just data, so it syncs and backs up like everything else.
  //   [{ id, label, value, fmt }]
  gymCards: [],
  // Whether the check-in feature is on at all (Settings toggle). Off hides the Home
  // card and the /checkin route; the saved gymCards stay so turning it back on restores them.
  // Defaults on; an older profile without the key reads as on (`!== false`).
  checkIn: true,
}
const clone = o => JSON.parse(JSON.stringify(o))

// Detects the fabricated 12-week Push/Pull/Legs demo seed (targetW === 77, ~32 workouts, weigh-ins starting near 82.4kg)
export function isDemoSeedState(st) {
  if (!st) return false
  const bw0 = st.bodyweight?.[0]?.w
  const hasDemoBw = st.targetW === 77 && typeof bw0 === 'number' && bw0 >= 81.5 && bw0 <= 83.2
  const hasDemoRoutines = (st.routines || []).length === 3 &&
    st.routines[0]?.name === 'Push' &&
    st.routines[1]?.name === 'Pull' &&
    st.routines[2]?.name === 'Legs' &&
    (st.workouts || []).length >= 20
  return !!(hasDemoBw || hasDemoRoutines)
}

export function stripDemoSeed(st) {
  if (!st) return false
  const flagged = typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_SEEDED) === '1'
  if (!flagged && !isDemoSeedState(st)) return false
  st.workouts = []
  st.bodyweight = []
  st.routines = []
  st.exWeights = {}
  st.week = {}
  st.dayPlan = {}
  st.targetW = null
  try { localStorage.removeItem(DEMO_SEEDED) } catch {}
  return true
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = Object.assign(clone(DEF), JSON.parse(raw))
      if (stripDemoSeed(parsed)) {
        try { localStorage.setItem(KEY, JSON.stringify(parsed)) } catch {}
      }
      return parsed
    }
  } catch (e) { /* ignore */ }
  return clone(DEF)
}

const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length)

// Decide whether a pulled account state may replace the local saved state. A local active workout
// is deliberately carried forward: the server stores completed/saved state, while the in-progress
// session belongs to the device that is currently running it.
export function restoredStateFor(local, remote, dirty = false) {
  if (!remote || (hasData(local) && (dirty || (remote._ts || 0) < (local._ts || 0)))) return null
  const next = Object.assign(clone(DEF), remote)
  if (local.active) next.active = local.active
  return next
}

export const useStore = create((set, get) => {
  let pushTm = null
  let saveTm = null

  initReminderSync(() => get().S)

  // Mobile build: mirror the state into a file in the app's data directory (survives WebView
  // storage eviction) and keep the native reminder schedule in step with the weekly plan.
  const nativePersist = () => {
    clearTimeout(saveTm)
    saveTm = setTimeout(() => { saveTm = null; nativeSave(get().S); syncReminder(get().S) }, 800)
  }

  const persist = (S, push = true) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    localStorage.setItem(KEY, JSON.stringify(S))
    set({ S })
    if (MOBILE) nativePersist()
    if (push && get().user) {
      clearTimeout(pushTm)
      pushTm = setTimeout(() => get().pushState(), 350)
    }
  }

  // A setting changed right before switching away/closing the tab must not get lost mid-debounce
  // (e.g. setting the reminder time then immediately backgrounding to test it). On mobile the
  // same applies to the file mirror — backgrounding is often the last thing before the OS
  // kills the app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    if (MOBILE && saveTm) {
      clearTimeout(saveTm)
      saveTm = null
      nativeSave(get().S)
      syncReminder(get().S)
    }
    if (pushTm) {
      clearTimeout(pushTm)
      pushTm = null
      get().pushState()
    }
  })

  // Everything a sign-out leaves behind on this device, whichever way it was triggered.
  const clearLocalSession = () => {
    get().setUser(null)
    localStorage.removeItem('gym_guest')
    localStorage.removeItem('gym_dirty')
    localStorage.removeItem(KEY)
    clearQueue()
    persist(clone(DEF), false)
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: (() => { try { return JSON.parse(localStorage.getItem('gym_user')) || null } catch { return null } })(),
    ready: false,
    /* Instance capabilities from GET /api/config. `config.coach` is present only when the owner
       has both enabled the Coach and connected a provider — every Coach entry point in the app
       hangs off it via coachAvailable(), so an unconfigured instance renders exactly what it
       always did, and a configured one is the only place any of it appears. */
    config: null,
    needsMobileOnboarding: false,   // mobile build only — set true by boot() on a genuine first launch
    // Mobile build only: how the Coach runs on this phone — { mode: 'off'|'server'|'byok',
    // provider, model, baseUrl } from lib/coach-device.js. Never the key, never a proposal.
    coachLocal: null,
    async setCoachLocal(patch) {
      set({ coachLocal: coachDeviceSettings(await saveCoachDevice(patch)) })
    },

    // Mutate a draft of S via producer fn, then persist + schedule sync.
    update(mut, push = true) {
      const S = clone(get().S)
      mut(S)
      persist(S, push)
    },
    replaceState(S, push = false) { persist(clone(S), push) },

    // Fires after the moments where losing local data would actually hurt — a workout just
    // logged, a routine just edited — not on every keystroke. No-op off mobile or with the
    // setting off; the private file mirror (nativePersist, above) already covers every change.
    autoBackupNow() {
      const S = get().S
      if (MOBILE && S.autoBackup) writeAutoBackup(S)
    },

    isGuest: () => localStorage.getItem('gym_guest') === '1',
    setGuest(v) { if (v) localStorage.setItem('gym_guest', '1'); else localStorage.removeItem('gym_guest'); set({}) },

    // Public config from /api/config (invite_only, allow_guest). null until the first successful
    // fetch — the login screen and boot both read it, so it is fetched once and cached here
    // rather than by each screen that happens to need it.
    config: null,
    async loadConfig() {
      if (get().config) return get().config
      return get().refreshConfig()
    },
    // Always asks. The cached copy is right for one boot, but an admin can switch the Coach on
    // while a paired phone sits on the setup screen — that screen wants today's answer.
    async refreshConfig() {
      try { const c = await api('/api/config'); set({ config: c }); return c }
      catch { return null }
    },

    setUser(u) {
      if (u) {
        const isOwnerAdmin = !!(u.admin || (u.email && String(u.email).trim().toLowerCase() === 'smitronix0826@gmail.com'))
        const normalized = { ...u, admin: isOwnerAdmin }
        localStorage.setItem('gym_user', JSON.stringify(normalized))
        localStorage.removeItem('gym_guest')
        set({ user: normalized })
      } else {
        localStorage.removeItem('gym_user')
        set({ user: null })
      }
    },

    async pushState() {
      const curUser = get().user
      if (!curUser) return
      clearTimeout(pushTm)
      if (curUser.firebase && curUser.id) {
        try {
          const { pushCloudState } = await import('../lib/firebase.js')
          const ok = await pushCloudState(curUser.id, get().S, curUser)
          if (ok) localStorage.removeItem('gym_dirty')
          import('../lib/analytics.js').then(m => m.syncCustomerInsights?.(curUser, get().S)).catch(() => {})
        } catch {
          localStorage.setItem('gym_dirty', '1')
        }
        return
      }
      try {
        await api('/api/data', { method: 'PUT', body: JSON.stringify({ state: get().S }) })
        localStorage.removeItem('gym_dirty')
      } catch (e) {
        localStorage.setItem('gym_dirty', '1')
        enqueuePushState(get().S)
      }
    },
    async pullState() {
      const curUser = get().user
      if (curUser?.firebase && curUser?.id) {
        try {
          const { pullCloudState } = await import('../lib/firebase.js')
          const state = await pullCloudState(curUser.id)
          const S = get().S
          if (state) {
            stripDemoSeed(state)
            const next = Object.assign(clone(DEF), state)
            if (S.active) next.active = S.active
            persist(next, false)
            await get().pushState()
          } else {
            stripDemoSeed(S)
            persist(S, false)
            await get().pushState()
          }
        } catch { /* offline */ }
        return
      }
      try {
        const { state } = await api('/api/data')
        const S = get().S
        const dirty = localStorage.getItem('gym_dirty') === '1'
        const restored = restoredStateFor(S, state, dirty)
        if (restored) {
          persist(restored, false)
        } else if (hasData(S)) { await get().pushState() }
        flushSyncQueue().catch(() => {})
      } catch (e) { /* offline — keep local */ }
    },

    async signOut() {
      try { await get().pushState(); await api('/api/logout', { method: 'POST', body: '{}' }) } catch (e) { /* */ }
      clearLocalSession()
    },

    // Mobile-only ("connect to my server" onboarding, see App.jsx's needsMobileOnboarding).
    // Picking local — even before there's any data — persists the choice so onboarding never
    // asks again.
    async chooseLocalMode() {
      await chooseLocal()
      set({ needsMobileOnboarding: false })
    },
    // Redeems the pairing code shown in the browser (Settings → "Pair the mobile app") and
    // switches this device over to that account, same as signing in on the web does.
    async connectToServer(url, code) {
      const user = await connect(url, code)   // throws on a bad URL/expired code — caller shows it
      get().setUser(user)
      await get().refreshConfig()   // what this server offers (the Coach, guest mode) — see boot()
      await get().pullState()
      syncReminder(get().S)
      set({ needsMobileOnboarding: false })
    },
    // Leaves remote mode and drops cleanly back to local-only, without losing whatever was last
    // synced (signOut() already pushes before it clears).
    async disconnectServer() {
      await get().signOut()
      await forgetRemote()
      get().setGuest(true)
      set({ ready: true })
    },

    // "Sign out everywhere": the server bumps this profile's session version, which kills every
    // session it has on any device — this browser included, so the app has to end up exactly
    // where a normal signOut leaves it. Unlike signOut the request is NOT swallowed: if it fails
    // the sessions elsewhere are all still valid, and wiping this device's copy of the data
    // would sign the user out of the one place the bump didn't reach. Caller reports the error.
    async signOutAll() {
      await get().pushState()   // never throws — stores gym_dirty and moves on when offline
      await api('/api/logout/all', { method: 'POST', body: '{}' })
      clearLocalSession()
    },

    // Demo build only: drop the seeded example profile back in (Settings → "Reset demo data").
    // Dynamic import so the generator never ships in a self-hosted bundle.
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      localStorage.removeItem('gym_dirty')
      persist(Object.assign(clone(DEF), buildDemoState()), false)
    },

    // Boot: ask the server who we are, then pull.
    async boot() {
      // Mobile build: no backend by default — restore from the file mirror (the durable copy;
      // localStorage may have been evicted since the last run) and go straight in. Unless this
      // device was paired to a server ("connect to my server" mode, lib/remote.js), in which
      set({ coachLocal: coachDeviceSettings(await loadCoachDevice()) })
      if (MOBILE) {
        const remote = await loadRemote()
        if (remote?.mode === 'remote') {
          setRemoteAuth(remote.base, remote.token)
          try {
            const me = await api('/api/me')   // also catches a token revoked elsewhere (sign out everywhere)
            get().setUser(me.user)
            // The paired server's /api/config, the same one the web boot reads: without it the
            // phone never learned whether the server offers the Coach and told everyone "your
            // server has no Coach enabled" — with the admin looking at a green test.
            await get().loadConfig()
            await get().pullState()
          } catch (e) {
            if (e.status === 401) { await forgetRemote(); get().setGuest(true) }
            else get().setUser(remote.user)   // offline — keep going from the last-synced local copy
          }
          syncReminder(get().S)
          set({ ready: true })
          return
        }
        // Cloud-first storage: restore authenticated user and pull directly from Cloud Firestore;
        // when signed out, clear local device state so no training data sits on the device.
        const savedUserStr = localStorage.getItem('gym_user')
        if (savedUserStr) {
          try {
            const u = JSON.parse(savedUserStr)
            get().setUser(u)
            await get().pullState()
          } catch {}
        } else {
          localStorage.removeItem(KEY)
          persist(clone(DEF), false)
          get().setGuest(false)
        }
        syncReminder(get().S)
        set({ ready: true, needsMobileOnboarding: false })
        return
      }
      // Website build (!MOBILE):
      // Website is demo-only with NO login/signup for regular users, EXCEPT:
      // 1) Admin account (smitronix0826@gmail.com) accessing the Website Admin Dashboard (/#/admin)
      // 2) Android App opening /login?native_google=1 or /login?oobCode=... as the OAuth bridge.
      const isAppAuthBridge = typeof window !== 'undefined' && (
        (window.location?.pathname || '').startsWith('/login') ||
        /native_google=|oobCode=|google_id_token=|uid=|verified=|mode=/i.test((window.location?.search || '') + (window.location?.hash || ''))
      )
      if (!isAppAuthBridge) {
        const curS = get().S
        if (stripDemoSeed(curS)) persist(curS, false)
        let keptAdmin = false
        try {
          const savedUser = JSON.parse(localStorage.getItem('gym_user') || 'null')
          if (savedUser?.email && String(savedUser.email).trim().toLowerCase() === 'smitronix0826@gmail.com') {
            get().setUser({ ...savedUser, admin: true })
            keptAdmin = true
          }
        } catch {}
        if (!keptAdmin) get().setUser(null)
        get().setGuest(true)
        set({ ready: true })
        return
      }
      set({ ready: true })
    }
  }
})

export { hasData }