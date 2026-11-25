import { EXDB } from './exercises-data.js'
import { LEGACY_EXERCISE_IDS } from './gymmane-templates.js'
import { t, getVersion, exerciseNameSearchText } from './i18n-core.js'

export { EXDB }

// Pure curated GymMane exercise catalogue (471 exercises with native vector animation art slugs).
export const CATALOGUE = EXDB

export const smOf = ex => (Array.isArray(ex?.sm) ? ex.sm : (ex?.sm ? [ex.sm] : []))

export const EXIDX = {}
CATALOGUE.forEach(e => { EXIDX[e.id] = e })

// Bridge legacy 4-digit IDs for saved user history/routines without polluting Object.keys(EXIDX).
const EXTRA_LEGACY_BRIDGE = {
  '0241': '3ZflifB', // Cable Pushdown
  '0586': 'C5jncD2', // Lying Leg Curl
  '0739': '7zdxRTl', // Leg Press
  '1323': 'fUBheHs', // Cable Seated Row
  '2330': 'RVwzP10', // Cable Pulldown
  '0314': 'ns0SIbU', // Dumbbell Incline Bench Press
  '0605': '82LxxkW', // Standing Calf Raise
}
const ALL_LEGACY_BRIDGE = { ...LEGACY_EXERCISE_IDS, ...EXTRA_LEGACY_BRIDGE }

export const resolveLegacyEx = id => {
  const mapped = ALL_LEGACY_BRIDGE[id]
  return mapped ? EXIDX[mapped] || null : null
}

export const BODYPARTS = [...new Set(CATALOGUE.map(e => e.bp))].sort()

// Equipment options present in a given list of exercises, most common first.
export function equipmentOf(list) {
  const c = {}
  list.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1))
}

// Custom (user-created) exercises live in synced state S.customEx and are merged into EXIDX.
let customIds = []
export function registerCustom(list) {
  customIds.forEach(id => {
    delete EXIDX[id]
    const builtIn = CATALOGUE.find(ex => ex.id === id)
    if (builtIn) EXIDX[id] = builtIn
    else if (ALL_LEGACY_BRIDGE[id] && EXIDX[ALL_LEGACY_BRIDGE[id]]) EXIDX[id] = EXIDX[ALL_LEGACY_BRIDGE[id]]
  })
  customIds = (list || []).map(e => e.id)
  ;(list || []).forEach(e => { EXIDX[e.id] = e })
}

// Full searchable catalogue — customs first so user-created exercises are easy to find.
export const allExercises = st => [...(st.customEx || []), ...CATALOGUE]

function searchableText(value) {
  if (Array.isArray(value)) return value.map(searchableText).join(' ')
  if (value == null) return ''
  try { return String(value) } catch { return '' }
}

function isSubsequence(needle, hay) {
  let i = 0
  for (const ch of hay) {
    if (ch === needle[i]) i++
    if (i === needle.length) return true
  }
  return false
}

export function searchScore(exercise, query) {
  const needle = searchableText(query).toLowerCase().trim()
  if (!needle) return 1
  const source = exercise && typeof exercise === 'object' ? exercise : {}
  const fields = [
    ['n', 100], ['aliases', 75], ['tg', 40], ['eq', 40],
    ['sm', 30], ['muscleGroups', 30], ['primaries', 30], ['secondaries', 30],
    ['desc', 10], ['cues', 10],
  ]
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
    if (!best) return 0
    total += best
  }
  return total
}

export function matchesExerciseSearch(exercise, query) {
  return searchScore(exercise, query) > 0
}

// Pure local GymMane vector animations — no legacy third-party ExerciseDB GIF/JPG CDN requests.
export const imgSrc = () => ''
export const gifSrc = () => ''
export function mediaUrlsFor() { return [] }

// Cardio exercises log time + speed/distance instead of weight × reps.
export const isCardio = idOrEx => {
  const ex = typeof idOrEx === 'string' ? (EXIDX[idOrEx] || resolveLegacyEx(idOrEx)) : idOrEx
  return ex?.bp === 'cardio' || ex?.mode === 'cardio'
}

const BODYWEIGHT_EQ = new Set(['body weight', 'band', 'resistance band'])
export const isBodyweightEq = idOrEx => {
  const ex = typeof idOrEx === 'string' ? (EXIDX[idOrEx] || resolveLegacyEx(idOrEx)) : idOrEx
  return BODYWEIGHT_EQ.has(ex?.eq)
}

export const exOr = id => EXIDX[id] || resolveLegacyEx(id) ||
  { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true }

export const normalizeStr = s => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

function extraAliasesFor(e) {
  const aliases = Array.isArray(e?.aliases) ? [...e.aliases] : []
  const n = (e?.n || '').toLowerCase()
  const eq = (e?.eq || '').toLowerCase()
  const bp = (e?.bp || '').toLowerCase()
  const tg = (e?.tg || '').toLowerCase()

  if (eq.includes('machine') || eq === 'assisted' || eq === 'sled machine' || eq === 'leverage machine') {
    aliases.push('machine', 'machines', 'gym machine')
  }
  if (eq.includes('cable')) aliases.push('cable', 'cables', 'pulley')
  if (eq.includes('dumbbell')) aliases.push('db', 'dumbbell', 'dumbbells')
  if (eq.includes('barbell') || eq.includes('trap bar')) aliases.push('bb', 'barbell', 'bar')
  if (eq.includes('smith')) aliases.push('smith', 'smith machine', 'machine')
  if (eq.includes('body weight')) aliases.push('bw', 'bodyweight', 'calisthenics')
  if (eq.includes('kettlebell')) aliases.push('kb', 'kettlebell')

  if (n.includes('romanian deadlift') || n.includes('stiff leg')) aliases.push('rdl')
  if (n.includes('overhead press') || n.includes('shoulder press') || n.includes('military press')) aliases.push('ohp')
  if (n.includes('pulldown')) aliases.push('lat pulldown', 'lat pull')
  if (n.includes('pushdown')) aliases.push('tricep pushdown', 'pushdown')
  if (n.includes('bench press')) aliases.push('bench press', 'chest press', 'flat bench')
  if (n.includes('fly') || n.includes('pec deck')) aliases.push('pec deck', 'chest fly')
  if (n.includes('hip thrust') || n.includes('glute bridge')) aliases.push('hip thrust', 'glute bridge')

  if (bp === 'chest' || tg === 'pectorals') aliases.push('pec', 'pecs', 'chest')
  if (bp === 'back' || tg === 'lats' || tg === 'upper back') aliases.push('lat', 'lats', 'back')
  if (bp === 'upper legs' || tg === 'quads') aliases.push('quad', 'quads', 'legs', 'leg')
  if (tg === 'hamstrings') aliases.push('ham', 'hams', 'hamstring', 'hamstrings', 'legs')
  if (bp === 'lower legs' || tg === 'calves') aliases.push('calf', 'calves', 'legs')
  if (tg === 'glutes') aliases.push('glute', 'glutes', 'hips')
  if (bp === 'upper arms' || tg === 'biceps' || tg === 'triceps') aliases.push('arms', 'arm', 'bicep', 'tricep')
  if (bp === 'shoulders' || tg === 'delts') aliases.push('delt', 'delts', 'shoulder', 'shoulders')
  if (bp === 'waist' || tg === 'abs') aliases.push('ab', 'abs', 'core')

  return aliases
}

const COMMON_STAPLES = [
  'barbell bench press', 'dumbbell bench press', 'barbell incline bench press',
  'dumbbell incline bench press', 'barbell full squat', 'leg press', 'leg extension',
  'barbell deadlift', 'barbell romanian deadlift', 'cable pulldown', 'cable seated row',
  'barbell bent over row', 'pull-up', 'dumbbell lateral raise', 'cable pushdown',
  'barbell curl', 'dumbbell biceps curl', 'dumbbell hammer curl', 'hanging leg raise',
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
  if (name.includes('stretch') && !q.includes('stretch')) score -= 300

  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.length) return score

  if (name === q) score += 1000
  else if (name.startsWith(q)) score += 600
  else if (name.includes(q)) score += 400

  const aliasesStr = (e?.aliases || []).join(' ').toLowerCase()
  if (aliasesStr && aliasesStr.includes(q)) score += 320

  const eq = (e?.eq || '').toLowerCase()
  const bp = (e?.bp || '').toLowerCase()
  const tg = (e?.tg || '').toLowerCase()

  if (q.includes('machine') && (eq.includes('machine') || eq === 'assisted' || eq === 'sled machine')) score += 200
  if (q.includes('cable') && eq.includes('cable')) score += 200
  if (q.includes('chest') && (bp === 'chest' || tg === 'pectorals' || name.includes('chest'))) score += 180
  if (q.includes('leg') && (bp === 'upper legs' || bp === 'lower legs' || tg === 'quads' || tg === 'hamstrings' || tg === 'calves' || name.includes('leg'))) score += 180
  if (q.includes('back') && (bp === 'back' || tg === 'lats' || tg === 'upper back' || name.includes('back'))) score += 180
  if (q.includes('lat') && (tg === 'lats' || tg === 'upper back' || name.includes('lat') || name.includes('pulldown'))) score += 180
  if (q.includes('shoulder') && (bp === 'shoulders' || tg === 'delts' || name.includes('shoulder'))) score += 180
  if ((q.includes('bicep') || q.includes('biceps')) && (tg === 'biceps' || name.includes('bicep') || name.includes('curl'))) score += 180
  if ((q.includes('tricep') || q.includes('triceps')) && (tg === 'triceps' || name.includes('tricep') || name.includes('pushdown'))) score += 180

  tokens.forEach(tok => {
    if (name.includes(tok)) score += 150
    if (aliasesStr.includes(tok)) score += 100
    if (tg.includes(tok)) score += 80
    if (bp.includes(tok)) score += 60
    if (eq.includes(tok)) score += 70
  })

  score -= Math.min(40, name.length * 0.4)
  return score
}

const TYPO_MAP = {
  dumbell: 'dumbbell',
  dumbel: 'dumbbell',
  machin: 'machine',
  extention: 'extension',
  puldown: 'pulldown',
  peck: 'pec',
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
    e?.desc || '',
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
  const words = corpus.split(/\s+/)
  return tokens.every(rawTok => {
    const tok = TYPO_MAP[rawTok] || rawTok
    if (tok.length <= 3) return words.some(w => w === tok || w.startsWith(tok))
    return words.some(w => w.startsWith(tok)) || corpus.includes(tok)
  })
}

export const QUICK_EQ_PRESETS = [
  { id: '', label: 'All Gear' },
  { id: 'machine', label: 'Machine', icon: 'gear', match: eq => (eq || '').includes('machine') || eq === 'assisted' || eq === 'sled machine' || eq === 'stationary bike' },
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
  if (group === 'back') return e?.bp === 'back' || e?.tg === 'lats' || e?.tg === 'upper back' || e?.tg === 'lower back' || e?.tg === 'spine' || e?.tg === 'traps'
  if (group === 'legs') return e?.bp === 'upper legs' || e?.bp === 'lower legs' || e?.tg === 'quads' || e?.tg === 'hamstrings' || e?.tg === 'calves' || e?.tg === 'glutes'
  if (group === 'shoulders') return e?.bp === 'shoulders' || e?.tg === 'delts'
  if (group === 'arms') return e?.bp === 'upper arms' || e?.bp === 'lower arms' || e?.tg === 'biceps' || e?.tg === 'triceps' || e?.tg === 'forearms'
  if (group === 'core') return e?.bp === 'waist' || e?.tg === 'abs' || e?.tg === 'obliques'
  return e?.bp === group
}

export function usageMap(st) {
  const u = {}
  if (!st) return u
  st.routines?.forEach(r => r.ex?.forEach(e => { u[e.id] = (u[e.id] || 0) + 1 }))
  st.workouts?.forEach(w => w.entries?.forEach(e => { u[e.id] = (u[e.id] || 0) + 1 }))
  return u
}
