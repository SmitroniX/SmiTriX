import { EXDB } from './exercises-data.js'
import { USER_EXERCISE_MUSCLE_OVERRIDES, exerciseMuscleMetadataFor } from './exercise-muscle-batch-1.js'
import { t, getVersion, exerciseNameSearchText } from './i18n-core.js'

export { EXDB }

// The generated dataset remains the compatibility/raw export. The runtime catalogue applies
// owner-approved muscle metadata as a narrow overlay, so imports and historical tests that rely
// on the upstream shape keep working while EXIDX and pickers see the corrected model.
const catalogueExercise = ex => {
  const metadata = exerciseMuscleMetadataFor(ex?.id)
  if (!Object.keys(metadata).length) return ex
  const out = { ...ex, ...metadata }
  const user = USER_EXERCISE_MUSCLE_OVERRIDES[ex?.id] || {}
  // A future dataset row may carry explicit arrays of its own; preserve those over generated
  // defaults unless the owner has deliberately supplied a correction for the same field.
  for (const key of ['primaries', 'secondaries']) {
    if (Object.prototype.hasOwnProperty.call(ex, key) && !Object.prototype.hasOwnProperty.call(user, key)) out[key] = ex[key]
  }
  if (Array.isArray(out.primaries)) out.primaries = [...out.primaries]
  if (Array.isArray(out.secondaries)) out.secondaries = [...out.secondaries]
  return out
}

export const CATALOGUE = EXDB.map(catalogueExercise)

// The generated dataset already supplies secondary muscles for most exercises. Keep the
// handful of conservative catalogue additions that are useful to the muscle map here so a
// dataset refresh does not erase them. Values follow the dataset's existing alias vocabulary.
const SECONDARY_ADDITIONS = {
  '0027': ['rear deltoids'], // barbell bent over row
  '0293': ['rear deltoids'], // dumbbell bent over row
  '0499': ['rear deltoids'], // inverted row
  '0861': ['rear deltoids'], // cable seated row
}

// Secondary muscles for an exercise, with the small conservative additions applied as an
// overlay. The raw dataset is never mutated - consumers that want the pristine catalogue
// (export, print, import) keep reading EXDB untouched, while the muscle map sees the
// enriched list. Values follow the dataset's existing alias vocabulary.
export const smOf = ex => {
  const base = Array.isArray(ex?.sm) ? ex.sm : (ex?.sm ? [ex.sm] : [])
  return [...new Set([...base, ...(SECONDARY_ADDITIONS[ex?.id] || [])])]
}

export const EXIDX = {}
CATALOGUE.forEach(e => { EXIDX[e.id] = e })
export const BODYPARTS = [...new Set(CATALOGUE.map(e => e.bp))].sort()

// Equipment options present in a given list of exercises, most common first (issue #6).
// Deriving them from the *already filtered* list keeps the chip row short and means
// every body-part × equipment combination on screen has results behind it.
export function equipmentOf(list) {
  const c = {}
  list.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1))
}

// Custom (user-created) exercises live in synced state S.customEx (issue #11) and are
// merged into the id index here so every EXIDX[id] lookup keeps working unchanged.
let customIds = []
export function registerCustom(list) {
  customIds.forEach(id => {
    delete EXIDX[id]
    const builtIn = CATALOGUE.find(ex => ex.id === id)
    if (builtIn) EXIDX[id] = builtIn
  })
  customIds = (list || []).map(e => e.id)
  ;(list || []).forEach(e => { EXIDX[e.id] = e })
}
// Full searchable catalogue — customs first so your own exercises are easy to find.
export const allExercises = st => [...(st.customEx || []), ...CATALOGUE]

function searchableText(value) {
  if (Array.isArray(value)) return value.map(searchableText).join(' ')
  if (value == null) return ''
  try { return String(value) } catch { return '' }
}

/** Case-insensitive search over built-in and legacy custom exercise metadata. */
function isSubsequence(needle, hay) {
  let i = 0
  for (const ch of hay) {
    if (ch === needle[i]) i++
    if (i === needle.length) return true
  }
  return false
}

// Fuzzy match score for one exercise against a query. Best hits: exact field match, then
// field prefix, then word-boundary starts, then substrings (closer to the start scores
// better), and finally typo-tolerant ordered subsequences. Fields are weighted - the name
// dominates, target/equipment matter, muscles and description are supporting evidence.
// 0 means no match, so matchesExerciseSearch stays a boolean filter while the picker can
// rank results by score.
export function searchScore(exercise, query) {
  const needle = searchableText(query).toLowerCase().trim()
  if (!needle) return 1
  const source = exercise && typeof exercise === 'object' ? exercise : {}
  const fields = [['n', 100], ['tg', 40], ['eq', 40], ['sm', 30], ['muscleGroups', 30], ['primaries', 30], ['secondaries', 30], ['desc', 10], ['cues', 10]]
  // Token-level matching: every query word must match somewhere (any order), so
  // "press bench" finds "Bench Press". The score sums each token's best hit.
  const tokens = needle.split(/[^a-z0-9]+/).filter(Boolean)
  if (!tokens.length) return 0
  let total = 0
  for (const token of tokens) {
    let best = 0
    for (const [field, weight] of fields) {
      const hay = searchableText(source[field]).toLowerCase()
      if (!hay) continue
      if (hay === token) best = Math.max(best, weight * 4)
      else if (hay.startsWith(token)) best = Math.max(best, weight * 3)
      const idx = hay.indexOf(token)
      if (idx > 0) best = Math.max(best, weight * 2 - Math.min(idx, 20) * 0.5)
      if (hay.split(/[^a-z0-9]+/).some(w => w.startsWith(token))) best = Math.max(best, weight * 2.5)
      if (isSubsequence(token, hay)) best = Math.max(best, weight + Math.max(0, 10 - (hay.length - token.length)))
    }
    if (!best) return 0 // every token must match
    total += best
  }
  return total
}

export function matchesExerciseSearch(exercise, query) {
  return searchScore(exercise, query) > 0
}

// High-availability CDN mirrors for exercise media (GIFs and JPGs).
// Primary CDN is jsDelivr with immutable commit hash; fallback is raw GitHub mirror.
export const PRIMARY_CDN_IMG = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/'
export const PRIMARY_CDN_GIF = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'

export const FALLBACK_CDN_IMG = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/'
export const FALLBACK_CDN_GIF = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'

// Media sits on high-availability CDNs by default so mobile builds and web builds
// never have broken, motionless, or missing animation media. Self-hosted deployments
// can override via VITE_IMG_BASE and VITE_GIF_BASE.
const ENV = import.meta.env || {}
const IMG_BASE = ENV.VITE_IMG_BASE || PRIMARY_CDN_IMG
const GIF_BASE = ENV.VITE_GIF_BASE || PRIMARY_CDN_GIF
export const imgSrc = ex => ex?.img ? (IMG_BASE + ex.img) : ''
export const gifSrc = ex => ex?.gif ? (GIF_BASE + ex.gif) : ''

export function mediaUrlsFor(ex, type = 'gif') {
  if (!ex) return []
  const file = type === 'gif' ? ex.gif : ex.img
  if (!file) return []
  const configured = type === 'gif' ? ENV.VITE_GIF_BASE : ENV.VITE_IMG_BASE
  const primary = type === 'gif' ? PRIMARY_CDN_GIF : PRIMARY_CDN_IMG
  const fallback = type === 'gif' ? FALLBACK_CDN_GIF : FALLBACK_CDN_IMG
  const urls = []
  if (configured) urls.push(configured + file)
  urls.push(primary + file, fallback + file)
  return [...new Set(urls)]
}

// Cardio exercises log time + speed instead of weight × reps.
export const isCardio = idOrEx => (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.bp === 'cardio'

// Exercises the dataset already knows carry no external load (issue #32) — a quarter of the
// catalogue. This seeds the `bw` flag on a fresh config so a push-up never asks for a weight
// nobody was going to enter. It is only the default: the flag lives on the config, so a dip
// done with a belt can turn it off and a custom exercise can turn it on.
// Equipment with no meaningful load in kg: your own body, or a band whose "weight" is a colour.
// Both default to the bodyweight model (one reps stepper, progression in reps then sets); the
// per-exercise Bodyweight switch still overrides it either way (issue #39).
const BODYWEIGHT_EQ = new Set(['body weight', 'band', 'resistance band'])
export const isBodyweightEq = idOrEx =>
  BODYWEIGHT_EQ.has((typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.eq)

// An id that resolves to nothing — a plan file built against a different exercise dataset,
// a custom exercise deleted on another device before the sync arrived — still has to
// render. A placeholder keeps it visible (and removable) instead of taking the whole view
// down on the first `ex.n`.
export const exOr = id => EXIDX[id] ||
  { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true }

// Normalizes text by lowercasing and stripping diacritics/accents (e.g. "elevação" -> "elevacao")
export const normalizeStr = s => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

// Multi-token, accent-insensitive and multilingual exercise search.
// Matches when all whitespace-separated words in the query appear anywhere in the exercise's
// name, equipment, target muscle, body part (both in English and translated to active language),
// secondary muscles or description.
//
// The haystack is built once per exercise and cached: NFD-normalising ~1300 catalogue entries
// on every keystroke costs ~8ms on a desktop and several times that on a phone. The cache key
// is the i18n version (bumped by every setLang), so switching language rebuilds the translated
// terms. Custom exercises are re-cached automatically — the store clones state on update, so an
// edited exercise arrives as a new object the WeakMap has never seen.
function extraAliasesFor(e) {
  const aliases = []
  const n = (e?.n || '').toLowerCase()
  const eq = (e?.eq || '').toLowerCase()
  const bp = (e?.bp || '').toLowerCase()
  const tg = (e?.tg || '').toLowerCase()

  // Machine & equipment aliases
  if (eq.includes('machine') || eq === 'assisted' || eq === 'sled machine') {
    aliases.push('machine', 'machines', 'gym machine', 'lever', 'selectorized', 'pin loaded', 'plate loaded')
  }
  if (eq.includes('cable')) {
    aliases.push('cable', 'cables', 'pulley', 'machine')
  }
  if (eq.includes('dumbbell')) {
    aliases.push('db', 'dumbbell', 'dumbbells')
  }
  if (eq.includes('barbell') || eq.includes('trap bar')) {
    aliases.push('bb', 'barbell', 'bar', 'barbells')
  }
  if (eq.includes('smith')) {
    aliases.push('smith', 'smith machine')
  }
  if (eq.includes('body weight')) {
    aliases.push('bw', 'bodyweight', 'calisthenics')
  }

  // Common movement & gym machine names
  if (n.includes('seated fly') || n.includes('chest fly') || n.includes('butterfly') || n.includes('pec fly')) {
    aliases.push('pec deck', 'pec dec', 'pec fly', 'butterfly', 'chest fly machine', 'peck deck')
  }
  if (n.includes('romanian deadlift') || n.includes('stiff leg')) {
    aliases.push('rdl')
  }
  if (n.includes('overhead press') || n.includes('shoulder press') || n.includes('military press')) {
    aliases.push('ohp')
  }
  if (n.includes('lateral pulldown') || n.includes('lat pulldown') || n.includes('pulldown')) {
    aliases.push('lat pulldown', 'lat pull', 'pulldowns')
  }
  if (n.includes('biceps curl') || n.includes('bicep curl') || n.includes('arm curl')) {
    aliases.push('bicep', 'biceps', 'bicep curl', 'biceps curl', 'curls')
  }
  if (n.includes('triceps pushdown') || n.includes('pushdown') || n.includes('tricep extension')) {
    aliases.push('tricep', 'triceps', 'tricep pushdown', 'pushdown', 'rope pushdown')
  }
  if (n.includes('leg press')) {
    aliases.push('leg press', 'leg press machine', '45 leg press', 'horizontal leg press')
  }
  if (n.includes('leg extension')) {
    aliases.push('leg extension', 'quad extension', 'leg extension machine')
  }
  if (n.includes('leg curl') || n.includes('hamstring curl')) {
    aliases.push('leg curl', 'hamstring curl', 'lying leg curl', 'seated leg curl')
  }
  if (n.includes('lateral raise') || n.includes('side lateral')) {
    aliases.push('lateral raise', 'side raise', 'side lateral raise', 'lateral raises')
  }
  if (n.includes('calf raise') || n.includes('calf press')) {
    aliases.push('calf raise', 'calves', 'calf machine', 'standing calf raise', 'seated calf raise')
  }
  if (n.includes('bench press')) {
    aliases.push('bench press', 'chest press', 'flat bench')
  }
  if (n.includes('incline bench') || n.includes('incline chest')) {
    aliases.push('incline press', 'incline bench', 'upper chest')
  }
  if (n.includes('preacher curl')) {
    aliases.push('preacher curl', 'bicep preacher')
  }
  if (n.includes('hack squat')) {
    aliases.push('hack squat', 'hack squat machine')
  }
  if (n.includes('seated row') || n.includes('cable row') || n.includes('cable seated row') || n.includes('bent over row')) {
    aliases.push('cable row', 'seated row', 'back row', 'rows')
  }
  if (n.includes('face pull')) {
    aliases.push('face pull', 'rear delt face pull')
  }
  if (n.includes('hip thrust') || n.includes('glute bridge')) {
    aliases.push('hip thrust', 'glute bridge', 'glute drive', 'hip thrust machine')
  }
  if (n.includes('t-bar row') || n.includes('t bar')) {
    aliases.push('t bar row', 't-bar row', 'chest supported row')
  }
  if (n.includes('assisted') && (n.includes('pull') || n.includes('chin'))) {
    aliases.push('assisted pull up', 'assisted chin up', 'assisted pullup', 'pull up machine')
  }
  if (n.includes('assisted') && n.includes('dip')) {
    aliases.push('assisted dip', 'assisted dips', 'dip machine')
  }
  if (n.includes('cable crossover') || (n.includes('cable') && n.includes('fly'))) {
    aliases.push('cable fly', 'cable crossover', 'high to low fly', 'low to high fly')
  }
  if (n.includes('crunch') || n.includes('ab coaster')) {
    aliases.push('cable crunch', 'ab machine', 'ab crunch')
  }
  if (n.includes('shrug')) {
    aliases.push('shrugs', 'trap shrug', 'traps')
  }

  // Muscle aliases
  if (bp === 'chest' || tg === 'pectorals') {
    aliases.push('pec', 'pecs', 'chest')
  }
  if (bp === 'back' || tg === 'lats') {
    aliases.push('lat', 'lats', 'back', 'wings')
  }
  if (bp === 'upper legs' || tg === 'quads') {
    aliases.push('quad', 'quads', 'thighs', 'legs', 'leg')
  }
  if (tg === 'hamstrings') {
    aliases.push('ham', 'hams', 'hamstring', 'hamstrings', 'legs', 'leg')
  }
  if (bp === 'lower legs' || tg === 'calves') {
    aliases.push('calf', 'calves', 'lower leg', 'legs')
  }
  if (tg === 'glutes') {
    aliases.push('glute', 'glutes', 'butt', 'booty', 'hips')
  }
  if (bp === 'upper arms' || tg === 'biceps' || tg === 'triceps') {
    aliases.push('arms', 'arm')
  }
  if (bp === 'shoulders' || tg === 'delts') {
    aliases.push('delt', 'delts', 'shoulder', 'shoulders')
  }
  if (bp === 'waist' || tg === 'abs') {
    aliases.push('ab', 'abs', 'core', 'abdominal', 'abdominals')
  }

  return aliases
}

const COMMON_STAPLES = [
  'barbell bench press', 'dumbbell bench press', 'incline barbell bench press',
  'incline dumbbell bench press', 'lever chest press', 'lever seated fly',
  'barbell squat', 'sled 45° leg press', 'lever leg extension', 'lever seated leg curl',
  'barbell deadlift', 'cable bar lateral pulldown', 'cable seated row',
  'overhead press', 'dumbbell lateral raise', 'cable triceps pushdown',
  'dumbbell bicep curl', 'ez barbell curl', 'barbell bent over row',
  'standing calf raise', 'hanging leg raise', 'smith bench press', 'smith squat'
]

export function scoreExercise(e, query = '', usage = {}, isFav = false) {
  let score = 0
  const name = (e?.n || '').toLowerCase()
  const q = normalizeStr(query).trim()

  if (isFav) score += 400
  if (usage[e?.id]) score += Math.min(300, usage[e.id] * 50)

  for (const staple of COMMON_STAPLES) {
    if (name.includes(staple)) {
      score += 150
      break
    }
  }

  if (!q) return score

  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.length) return score

  if (name === q) score += 1000
  else if (name.startsWith(q)) score += 600
  else if (name.includes(q)) score += 400

  tokens.forEach(tok => {
    if (name.includes(tok)) score += 150
    if ((e?.tg || '').toLowerCase().includes(tok)) score += 80
    if ((e?.bp || '').toLowerCase().includes(tok)) score += 60
    if ((e?.eq || '').toLowerCase().includes(tok)) score += 70
  })

  // Short clean names rank slightly higher than verbose ones
  score -= Math.min(40, name.length * 0.4)

  return score
}

const TYPO_MAP = {
  'dumbell': 'dumbbell',
  'dumbel': 'dumbbell',
  'machin': 'machine',
  'extention': 'extension',
  'puldown': 'pulldown',
  'peck': 'pec',
}

const corpusCache = new WeakMap()

function corpusOf(e) {
  const v = getVersion()
  const hit = corpusCache.get(e)
  if (hit && hit.v === v) return hit.s
  const sm = Array.isArray(e?.sm) ? e.sm : []
  const aliases = extraAliasesFor(e)
  const s = normalizeStr([
    exerciseNameSearchText(e),
    e?.tg || '', t(e?.tg || ''),
    e?.eq || '', t(e?.eq || ''),
    e?.bp || '', t(e?.bp || ''),
    ...sm, ...sm.map(m => t(m)),
    ...aliases,
    e?.desc || ''
  ].join(' '))
  corpusCache.set(e, { v, s })
  return s
}

export function matchExercise(e, query) {
  if (!query) return true
  const tokens = normalizeStr(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  if (!e || typeof e !== 'object') return false
  const corpus = corpusOf(e)
  return tokens.every(tok => {
    if (corpus.includes(tok)) return true
    const fixed = TYPO_MAP[tok]
    if (fixed && corpus.includes(fixed)) return true
    return false
  })
}

export const QUICK_EQ_PRESETS = [
  { id: '', label: 'All Gear' },
  { id: 'machine', label: 'Machine', icon: 'gear', match: eq => (eq || '').includes('machine') || eq === 'assisted' },
  { id: 'cable', label: 'Cable', icon: 'link', match: eq => eq === 'cable' },
  { id: 'dumbbell', label: 'Dumbbell', icon: 'dumbbell', match: eq => eq === 'dumbbell' },
  { id: 'barbell', label: 'Barbell', icon: 'dumbbell', match: eq => (eq || '').includes('barbell') || (eq || '').includes('trap bar') },
  { id: 'bodyweight', label: 'Bodyweight', icon: 'figureStrength', match: eq => eq === 'body weight' },
]

export const QUICK_MUSCLE_GROUPS = [
  { id: '', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
]

export function matchesMuscleGroup(e, group) {
  if (!group || group === 'all') return true
  if (group === 'chest') return e?.bp === 'chest' || e?.tg === 'pectorals'
  if (group === 'back') return e?.bp === 'back' || e?.tg === 'lats' || e?.tg === 'upper back' || e?.tg === 'spine'
  if (group === 'legs') return e?.bp === 'upper legs' || e?.bp === 'lower legs' || e?.tg === 'quads' || e?.tg === 'hamstrings' || e?.tg === 'calves' || e?.tg === 'glutes'
  if (group === 'shoulders') return e?.bp === 'shoulders' || e?.tg === 'delts'
  if (group === 'arms') return e?.bp === 'upper arms' || e?.bp === 'lower arms' || e?.tg === 'biceps' || e?.tg === 'triceps'
  if (group === 'core') return e?.bp === 'waist' || e?.tg === 'abs'
  return e?.bp === group
}

export function usageMap(st) {
  const u = {}
  if (!st) return u
  st.routines?.forEach(r => r.ex?.forEach(e => { u[e.id] = (u[e.id] || 0) + 1 }))
  st.workouts?.forEach(w => w.entries?.forEach(e => { u[e.id] = (u[e.id] || 0) + 1 }))
  return u
}

