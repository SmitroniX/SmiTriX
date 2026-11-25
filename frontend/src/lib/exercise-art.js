import { ART_BOUNDS, ART_SLUGS } from './exercise-art-manifest.js'

export { ART_BOUNDS, ART_SLUGS }

const ART_SET = new Set(ART_SLUGS)

// Pre-tokenized index for fast O(394) fuzzy matching
const SLUG_TOKENS = ART_SLUGS.map(slug => ({
  slug,
  tokens: slug.split('-'),
  set: new Set(slug.split('-')),
}))

const MOVEMENT_WORDS = new Set([
  'press', 'squat', 'deadlift', 'curl', 'row', 'pulldown', 'pull', 'push', 'fly', 'raise',
  'extension', 'dip', 'lunge', 'crunch', 'plank', 'shrug', 'thrust', 'bridge', 'kickback',
  'pullover', 'pushdown', 'calf', 'swing', 'snatch', 'clean', 'carry', 'walk', 'run', 'bike',
  'jump', 'twist', 'rollout', 'wheel', 'climber', 'burpee', 'hang', 'muscle', 'crossover',
  'abduction', 'adduction', 'step', 'march', 'hold', 'stretch', 'rotation', 'chop', 'woodchop',
  'thruster', 'skullcrusher', 'kick', 'flutter', 'deadbug', 'bug', 'bird', 'dog', 'superman',
  'clamshell', 'hydrant', 'goodmorning', 'hyperextension', 'pendlay', 'meadows', 'tbar', 'face',
])

const EQUIP_WORDS = new Set([
  'barbell', 'dumbbell', 'cable', 'machine', 'smith', 'band', 'banded', 'kettlebell',
  'ball', 'sled', 'assisted', 'weighted', 'landmine', 'trx', 'rope', 'ez', 'plate', 'box', 'bench',
])

const MODIFIER_WORDS = new Set([
  'incline', 'decline', 'seated', 'standing', 'lying', 'bent', 'reverse', 'close', 'wide',
  'single', 'one', 'bulgarian', 'romanian', 'sumo', 'goblet', 'front', 'hack', 'pistol',
  'preacher', 'hammer', 'concentration', 'arnold', 'lateral', 'rear', 'overhead', 'chest',
  'triceps', 'biceps', 'leg', 'hip', 'back', 'side', 'hanging', 'kneeling', 'split', 'zercher',
  'jefferson', 'nordic', 'glute', 'wrist', 'forearm', 'neck', 'upright', 'straight', 'flat',
  'diamond', 'archer', 'pike', 'handstand', 'bicycle', 'russian', 'turkish', 'farmer', 'suitcase',
  'donkey', 'sissy', 'curtsy', 'pendulum', 'bayesian', 'spider', 'zottman', 'drag', 'scott',
])

// High-priority alias overrides for canonical SmiTriX exercises
const EXACT_ALIASES = {
  'barbell-bench-press': 'bench-press',
  'barbell-full-squat': 'squat',
  'barbell-squat': 'squat',
  'barbell-back-squat': 'squat',
  'barbell-deadlift': 'deadlift',
  'barbell-curl': 'barbell-biceps-curl',
  'barbell-biceps-curl': 'barbell-close-grip-curl',
  'barbell-bent-over-row': 'barbell-row',
  'barbell-incline-bench-press': 'incline-bench-press',
  'barbell-decline-bench-press': 'decline-bench-press',
  'barbell-overhead-press': 'overhead-press',
  'barbell-military-press': 'overhead-press',
  'barbell-standing-military-press': 'overhead-press',
  'barbell-front-squat': 'front-squat',
  'barbell-romanian-deadlift': 'romanian-deadlift',
  'barbell-sumo-deadlift': 'sumo-deadlift',
  'barbell-hip-thrust': 'hip-thrust',
  'barbell-shrug': 'shrug',
  'barbell-upright-row': 'upright-row',
  'barbell-good-morning': 'good-morning',
  'barbell-lying-triceps-extension': 'skull-crusher',
  'barbell-skull-crusher': 'skull-crusher',
  'barbell-calf-raise': 'calf-raise',
  'barbell-standing-calf-raise': 'calf-raise',
  'dumbbell-bench-press': 'dumbbell-bench-press',
  'dumbbell-incline-bench-press': 'dumbbell-incline-press',
  'dumbbell-incline-press': 'dumbbell-incline-press',
  'dumbbell-decline-bench-press': 'dumbbell-decline-press',
  'dumbbell-fly': 'dumbbell-fly',
  'dumbbell-incline-fly': 'dumbbell-incline-fly',
  'dumbbell-biceps-curl': 'dumbbell-curl',
  'dumbbell-curl': 'dumbbell-curl',
  'dumbbell-hammer-curl': 'hammer-curl',
  'dumbbell-lateral-raise': 'lateral-raise',
  'dumbbell-front-raise': 'front-raise',
  'dumbbell-shoulder-press': 'dumbbell-shoulder-press',
  'dumbbell-seated-shoulder-press': 'dumbbell-shoulder-press',
  'dumbbell-arnold-press': 'arnold-press',
  'dumbbell-bent-over-row': 'dumbbell-row',
  'dumbbell-one-arm-row': 'dumbbell-row',
  'dumbbell-lunge': 'dumbbell-lunge',
  'dumbbell-goblet-squat': 'goblet-squat',
  'dumbbell-bulgarian-split-squat': 'bulgarian-split-squat',
  'cable-pulldown': 'lat-pulldown',
  'cable-lat-pulldown': 'lat-pulldown',
  'cable-wide-grip-lat-pulldown': 'wide-grip-lat-pulldown',
  'cable-seated-row': 'seated-cable-row',
  'cable-pushdown': 'triceps-pushdown',
  'cable-triceps-pushdown': 'triceps-pushdown',
  'cable-rope-pushdown': 'rope-pushdown',
  'cable-face-pull': 'face-pull',
  'cable-crossover': 'cable-fly',
  'cable-fly': 'cable-fly',
  'cable-lateral-raise': 'cable-lateral-raise',
  'cable-curl': 'cable-curl',
  'cable-biceps-curl': 'cable-curl',
  'pull-up': 'pull-up',
  'chin-up': 'chin-up',
  'push-up': 'push-up',
  'chest-dip': 'chest-dip',
  'triceps-dip': 'dip',
  'sled-leg-press': 'leg-press',
  'sled-45-leg-press': 'leg-press',
  'lever-leg-extension': 'leg-extension',
  'lever-seated-leg-curl': 'seated-leg-curl',
  'lever-lying-leg-curl': 'lying-leg-curl',
  'lever-chest-press': 'machine-chest-press',
  'lever-seated-fly': 'pec-deck',
  'lever-pec-deck-fly': 'pec-deck',
  'lever-shoulder-press': 'machine-shoulder-press',
  'lever-seated-row': 'machine-row',
  'lever-lat-pulldown': 'lat-pulldown',
  'lever-standing-calf-raise': 'calf-raise',
  'lever-seated-calf-raise': 'seated-calf-raise',
  'front-plank': 'plank',
  'hanging-leg-raise': 'hanging-leg-raise',
  'russian-twist': 'russian-twist',
  'mountain-climber': 'mountain-climber',
  'burpee': 'burpee',
  'kettlebell-swing': 'kettlebell-swing',
}

function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/push[\s-]?ups?/g, 'push up')
    .replace(/pull[\s-]?ups?/g, 'pull up')
    .replace(/chin[\s-]?ups?/g, 'chin up')
    .replace(/sit[\s-]?ups?/g, 'sit up')
    .replace(/step[\s-]?ups?/g, 'step up')
    .replace(/pull[\s-]?downs?/g, 'pulldown')
    .replace(/push[\s-]?downs?/g, 'pushdown')
    .replace(/kick[\s-]?backs?/g, 'kickback')
    .replace(/flyes?\b/g, 'fly')
    .replace(/\bbicep\b/g, 'biceps')
    .replace(/\btricep\b/g, 'triceps')
    .replace(/\bdeltoids?\b/g, 'delt')
    .replace(/\bdelts\b/g, 'delt')
    .replace(/\bshoulders\b/g, 'shoulder')
    .replace(/\blever\b/g, 'machine')
    .replace(/\bsled\b/g, 'machine')
    .replace(/\bez[\s-]?barbell\b/g, 'barbell')
    .replace(/\bbody[\s-]?weight\b/g, 'bodyweight')
    .replace(/\bweighted\b/g, 'weighted')
    .replace(/\bsmith\s+machine\b/g, 'smith')
    .replace(/\bdead[\s-]?lifts?\b/g, 'deadlift')
    .replace(/\bsquats\b/g, 'squat')
    .replace(/\blunges\b/g, 'lunge')
    .replace(/\bcurls\b/g, 'curl')
    .replace(/\brows\b/g, 'row')
    .replace(/\braises\b/g, 'raise')
    .replace(/\bpresses\b/g, 'press')
    .replace(/\bdips\b/g, 'dip')
    .replace(/\bcrunches\b/g, 'crunch')
    .replace(/\bplanks\b/g, 'plank')
    .replace(/\bextensions\b/g, 'extension')
    .replace(/\bshrugs\b/g, 'shrug')
    .replace(/\bcalves\b/g, 'calf')
    .replace(/\bglutes\b/g, 'glute')
    .replace(/\bhamstrings\b/g, 'hamstring')
    .replace(/\bquads\b/g, 'quad')
    .replace(/\b45\s*degree\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function equipHintFrom(eq) {
  const s = String(eq || '').toLowerCase()
  if (s.includes('barbell') || s.includes('ez') || s.includes('olympic')) return 'barbell'
  if (s.includes('dumbbell')) return 'dumbbell'
  if (s.includes('cable')) return 'cable'
  if (s.includes('smith')) return 'smith'
  if (s.includes('band') || s.includes('resistance')) return 'band'
  if (s.includes('kettlebell')) return 'kettlebell'
  if (s.includes('machine') || s.includes('lever') || s.includes('sled')) return 'machine'
  if (s.includes('assisted')) return 'assisted'
  if (s.includes('ball')) return 'ball'
  return ''
}

function fallbackForBodyPart(ex) {
  const bp = String(ex?.bp || '').toLowerCase()
  const tg = String(ex?.tg || '').toLowerCase()
  const eq = equipHintFrom(ex?.eq)
  const pick = (...candidates) => candidates.find(c => ART_SET.has(c)) || ART_SLUGS[0]

  if (bp.includes('chest') || tg.includes('pect')) {
    if (eq === 'dumbbell') return pick('dumbbell-bench-press', 'dumbbell-incline-press', 'dumbbell-fly', 'bench-press')
    if (eq === 'cable') return pick('cable-fly', 'bench-press')
    if (eq === 'band') return pick('band-chest-fly', 'push-up')
    if (eq === 'machine') return pick('machine-chest-press', 'pec-deck', 'bench-press')
    if (eq === 'barbell') return pick('bench-press')
    return pick('push-up', 'chest-dip', 'bench-press')
  }
  if (bp.includes('back') || tg.includes('lat') || tg.includes('trap')) {
    if (tg.includes('trap')) return pick(eq === 'dumbbell' ? 'dumbbell-shrug' : eq === 'cable' ? 'cable-shrug' : 'shrug', 'shrug')
    if (eq === 'cable') return pick('lat-pulldown', 'seated-cable-row', 'barbell-row')
    if (eq === 'dumbbell') return pick('dumbbell-row', 'barbell-row')
    if (eq === 'band') return pick('banded-row', 'banded-lat-pulldown')
    if (eq === 'barbell') return pick('barbell-row', 'deadlift')
    if (eq === 'machine') return pick('machine-row', 'lat-pulldown', 'assisted-pull-up')
    return pick('pull-up', 'back-extension', 'barbell-row')
  }
  if (bp.includes('shoulder') || tg.includes('delt')) {
    if (eq === 'cable') return pick('cable-lateral-raise', 'cable-front-raise', 'face-pull')
    if (eq === 'dumbbell') return pick('arnold-press', 'dumbbell-shoulder-press', 'lateral-raise')
    if (eq === 'band') return pick('band-pull-apart', 'band-reverse-fly', 'band-upright-row')
    if (eq === 'barbell') return pick('barbell-seated-overhead-press', 'overhead-press')
    return pick('arnold-press', 'barbell-seated-overhead-press', 'arm-circles')
  }
  if (bp.includes('lower legs') || tg.includes('calv')) {
    if (eq === 'band') return pick('band-calf-raise', 'calf-raise')
    if (eq === 'dumbbell') return pick('dumbbell-seated-one-leg-calf-raise', 'calf-raise')
    return pick('calf-raise', 'donkey-calf-raise', 'band-calf-raise')
  }
  if (bp.includes('upper legs') || bp.includes('legs') || tg.includes('quad') || tg.includes('glute') || tg.includes('ham')) {
    if (tg.includes('glute')) return pick('barbell-glute-bridge', 'banded-hip-thrust', 'hip-thrust', 'squat')
    if (tg.includes('ham')) return pick('romanian-deadlift', 'dumbbell-romanian-deadlift', 'deadlift')
    if (eq === 'dumbbell') return pick('dumbbell-romanian-deadlift', 'barbell-lunge', 'goblet-squat', 'squat')
    if (eq === 'band') return pick('banded-squat', 'banded-glute-bridge')
    if (eq === 'barbell') return pick('barbell-bench-squat', 'barbell-lunge', 'deadlift')
    return pick('barbell-hack-squat', 'barbell-bench-squat', 'barbell-lunge', 'deadlift')
  }
  if (bp.includes('upper arms') || tg.includes('bicep') || tg.includes('tricep')) {
    if (tg.includes('tricep')) {
      if (eq === 'cable') return pick('cable-incline-triceps-extension', 'triceps-pushdown', 'dip')
      if (eq === 'dumbbell') return pick('dumbbell-lying-triceps-extension', 'dip')
      if (eq === 'barbell') return pick('barbell-incline-triceps-extension', 'barbell-behind-head-triceps-extension', 'dip')
      return pick('dip', 'bench-dip', 'assisted-dip')
    }
    if (eq === 'cable') return pick('bayesian-cable-curl', 'cable-curl', 'barbell-close-grip-curl')
    if (eq === 'band') return pick('band-biceps-curl', 'barbell-close-grip-curl')
    if (eq === 'barbell') return pick('barbell-close-grip-curl', 'barbell-concentration-curl')
    return pick('barbell-concentration-curl', 'ball-seated-curl', 'band-biceps-curl')
  }
  if (bp.includes('lower arms') || tg.includes('forearm')) {
    return pick('wrist-curl', 'barbell-close-grip-curl', 'active-hang')
  }
  if (bp.includes('waist') || bp.includes('core') || tg.includes('abs')) {
    if (eq === 'cable') return pick('cable-crunch', 'crunch')
    if (eq === 'band') return pick('banded-dead-bug', 'banded-pallof-press', 'crunch')
    return pick('crunch', 'plank', 'ab-wheel', 'bicycle-crunch')
  }
  if (bp.includes('cardio')) {
    return pick('assault-bike', 'plank-jack', 'mountain-climber', 'burpee')
  }
  return pick('bench-press', 'barbell-row', 'deadlift')
}

const slugMemo = new Map()

export function resolveExerciseArtSlug(ex) {
  if (!ex || typeof ex !== 'object') return null
  const cacheKey = `${ex.id || ''}|${ex.n || ''}|${ex.eq || ''}|${ex.bp || ''}|${ex.tg || ''}`
  if (slugMemo.has(cacheKey)) return slugMemo.get(cacheKey)

  const norm = normalizeText(ex.n)
  const hyphen = norm.replace(/\s+/g, '-')

  // 1. Direct exact or alias hit
  if (ART_SET.has(hyphen)) {
    slugMemo.set(cacheKey, hyphen)
    return hyphen
  }
  if (EXACT_ALIASES[hyphen] && ART_SET.has(EXACT_ALIASES[hyphen])) {
    slugMemo.set(cacheKey, EXACT_ALIASES[hyphen])
    return EXACT_ALIASES[hyphen]
  }

  // 2. Try stripping leading equipment token
  const rawTokens = norm ? norm.split(' ').filter(Boolean) : []
  const eqHint = equipHintFrom(ex.eq)
  if (rawTokens.length > 1 && EQUIP_WORDS.has(rawTokens[0])) {
    const stripped = rawTokens.slice(1).join('-')
    if (ART_SET.has(stripped)) {
      slugMemo.set(cacheKey, stripped)
      return stripped
    }
    if (EXACT_ALIASES[stripped] && ART_SET.has(EXACT_ALIASES[stripped])) {
      slugMemo.set(cacheKey, EXACT_ALIASES[stripped])
      return EXACT_ALIASES[stripped]
    }
  }

  // 3. Weighted token-overlap fuzzy match across all 394 GymMane vector animations
  const qSet = new Set(rawTokens)
  if (eqHint) qSet.add(eqHint)
  if (ex.tg) {
    for (const tk of normalizeText(ex.tg).split(' ')) if (tk.length > 2) qSet.add(tk)
  }

  let bestSlug = null
  let bestScore = 0

  for (let i = 0; i < SLUG_TOKENS.length; i++) {
    const entry = SLUG_TOKENS[i]
    let score = 0
    let matchedCount = 0

    for (const tk of entry.tokens) {
      if (qSet.has(tk)) {
        matchedCount++
        if (MOVEMENT_WORDS.has(tk)) score += 4.5
        else if (MODIFIER_WORDS.has(tk)) score += 2.2
        else if (EQUIP_WORDS.has(tk)) score += 1.8
        else score += 1.5
      } else if (EQUIP_WORDS.has(tk) && eqHint && tk !== eqHint && !(tk === 'banded' && eqHint === 'band')) {
        score -= 0.7
      }
    }

    // Bonus for consecutive bigram match
    if (entry.tokens.length >= 2 && norm.includes(entry.tokens.join(' '))) {
      score += 4.0
    }
    // Slight preference for concise canonical matches when tied
    if (matchedCount > 0) {
      score += (matchedCount / entry.tokens.length) * 1.4
    }

    if (score > bestScore) {
      bestScore = score
      bestSlug = entry.slug
    }
  }

  const resolved = bestScore >= 4.2 && bestSlug ? bestSlug : fallbackForBodyPart(ex)
  slugMemo.set(cacheKey, resolved)
  return resolved
}

// LRU cache for fetched SVG path frames
const CACHE_LIMIT = 64
const artCache = new Map()
const inflight = new Map()

export function getCachedExerciseArt(slug, still = false) {
  if (!slug) return null
  const full = artCache.get(slug)
  if (full) return full
  if (still) return artCache.get(`${slug}#still`) || null
  return null
}

export async function loadExerciseArt(slug, { still = false } = {}) {
  if (!slug || !ART_SET.has(slug)) return null
  const key = still ? `${slug}#still` : slug
  const hit = artCache.get(slug) || (still ? artCache.get(key) : null)
  if (hit) {
    artCache.delete(key)
    artCache.set(key, hit)
    return hit
  }
  if (inflight.has(slug)) return inflight.get(slug)
  if (typeof fetch !== 'function') return null

  const promise = (async () => {
    try {
      const res = await fetch(`./smitrix-ui/art/${slug}.txt`)
      if (!res || !res.ok) return null
      const raw = await res.text()
      const lines = raw.split('\n').map(l => l.trim()).filter(l => l && (l[0] === 'M' || l[0] === 'm'))
      if (!lines.length) return null
      const bounds = ART_BOUNDS[slug] || [0, 0, 512, 512]
      const data = {
        slug,
        frames: lines,
        viewBox: `${bounds[0]} ${bounds[1]} ${bounds[2]} ${bounds[3]}`,
      }
      artCache.set(slug, data)
      if (artCache.size > CACHE_LIMIT) {
        const oldest = artCache.keys().next().value
        if (oldest) artCache.delete(oldest)
      }
      return data
    } catch {
      return null
    } finally {
      inflight.delete(slug)
    }
  })()

  inflight.set(slug, promise)
  return promise
}

export function prefetchExerciseArt(ex) {
  const slug = resolveExerciseArtSlug(ex)
  if (slug) loadExerciseArt(slug).catch(() => {})
}
