import { EXIDX } from './exercises.js'
import { MUSCLES, MUSCLE_NAME, musclesOf, muscleBalanceWindow, loadOfWorkouts } from './muscles.js'
import { fatigueOf, FATIGUE_STATES, FATIGUE_HALF_LIFE_MS, LB_TO_KG, exerciseFor } from './recovery.js'
import { fatigueStateOf } from './recovery-view.js'
import { isWarmupRow, extraVolumeOf } from './workout-model.js'

/**
 * 30-day Muscle Recovery & Readiness Index module.
 *
 * Models system-level and per-muscle recovery, readiness percentage (0-100%),
 * rolling 30-day volume (tonnage) & completed work sets, recovery time in hours
 * until fatigue drops below the ready threshold (< 0.25), and actionable
 * training recommendations.
 */

export const READINESS_CATEGORIES = Object.freeze({
  OPTIMAL: 'optimal',
  GOOD: 'good',
  MODERATE: 'moderate',
  LOW: 'low',
})

export const READY_FATIGUE_THRESHOLD = 0.25

/**
 * Calculate the exact recovery time in hours required for a muscle's fatigue to decay
 * below the ready threshold (0.25).
 *
 * Uses the exponential half-life decay formula:
 *   v(t) = v0 * 0.5 ** (t / halfLife)
 * Where fatigue f = 1 - exp(-v), giving v = -ln(1 - f).
 * At the ready threshold (f = 0.25), v_ready = -ln(0.75) ≈ 0.287682.
 * Thus: t = halfLife * ln(v / v_ready) / ln(2).
 *
 * @param {number} fatigueValue Current numeric fatigue value from fatigueOf() (0 to 1).
 * @param {number} [halfLifeMs=FATIGUE_HALF_LIFE_MS] Half-life in ms (defaults to 36 hours).
 * @returns {number} Estimated hours to recovery, rounded to 1 decimal place; 0 if already <= 0.25.
 */
export function calculateMuscleRecoveryHours(fatigueValue, halfLifeMs = FATIGUE_HALF_LIFE_MS) {
  const f = Number(fatigueValue)
  if (!Number.isFinite(f) || f <= READY_FATIGUE_THRESHOLD) return 0
  const clampedF = Math.min(0.9999, Math.max(READY_FATIGUE_THRESHOLD, f))
  const v = -Math.log(1 - clampedF)
  const vReady = -Math.log(1 - READY_FATIGUE_THRESHOLD)
  if (v <= vReady) return 0
  const hl = Number.isFinite(Number(halfLifeMs)) && Number(halfLifeMs) > 0 ? Number(halfLifeMs) : FATIGUE_HALF_LIFE_MS
  const halfLifeHours = hl / 3600000
  const hours = halfLifeHours * (Math.log(v / vReady) / Math.LN2)
  return Math.round(hours * 10) / 10
}

/**
 * Convert numeric fatigue (0 to 1) to a readiness percentage score (0 to 100).
 *
 * 0 fatigue -> 100% readiness.
 * 0.25 fatigue -> 75% readiness.
 * 0.5 fatigue -> 50% readiness.
 *
 * @param {number} fatigueValue
 * @returns {number} Integer between 0 and 100.
 */
export function muscleReadinessScore(fatigueValue) {
  const f = Number(fatigueValue)
  if (!Number.isFinite(f)) return 100
  const clamped = Math.max(0, Math.min(1, f))
  return Math.round((1 - clamped) * 100)
}

/**
 * Find the latest completed workout timestamp for each muscle.
 *
 * @param {Array<object>} workouts
 * @returns {Record<string, number>}
 */
export function latestMuscleTraining(workouts) {
  const latest = {}
  for (const workout of workouts || []) {
    const timestamp = Number(workout?.start || (workout?.d ? new Date(workout.d).getTime() : NaN))
    if (!Number.isFinite(timestamp)) continue
    for (const entry of workout?.entries || []) {
      if (!entry || typeof entry !== 'object') continue
      if (!(entry?.sets || []).some(set => set?.done === true && !isWarmupRow(set))) continue
      const exercise = exerciseFor(entry)
      for (const slug of Object.keys(musclesOf(exercise))) {
        if (MUSCLES.includes(slug) && (latest[slug] == null || timestamp > latest[slug])) {
          latest[slug] = timestamp
        }
      }
    }
  }
  return latest
}

/**
 * Calculate volume (tonnage) across workouts per muscle, weighted by muscle involvement.
 *
 * @param {Array<object>} workouts
 * @param {object} [opts]
 * @returns {Record<string, number>}
 */
export function volumeOfWorkouts(workouts, opts = {}) {
  const vols = Object.fromEntries(MUSCLES.map(slug => [slug, 0]))
  for (const w of workouts || []) {
    for (const e of w?.entries || []) {
      if (!e || typeof e !== 'object') continue
      const ex = exerciseFor(e)
      const weights = musclesOf(ex)
      for (const s of e?.sets || []) {
        if (!s?.done || isWarmupRow(s)) continue
        const reps = Math.max(0, Number(s.r) || 0)
        const weight = Math.max(0, Number(s.w) || 0)
        const extra = Math.max(0, extraVolumeOf(s))
        const rowVol = (weight * reps) + extra
        for (const [slug, wgt] of Object.entries(weights)) {
          if (Object.prototype.hasOwnProperty.call(vols, slug)) {
            vols[slug] += rowVol * wgt
          }
        }
      }
    }
  }
  for (const slug of MUSCLES) {
    vols[slug] = Math.round(vols[slug])
  }
  return vols
}

/**
 * Major anatomical regions grouping for high-level summaries.
 */
export const MUSCLE_REGIONS = Object.freeze({
  chest: { name: 'Chest', muscles: ['chest'] },
  back: { name: 'Back', muscles: ['upper-back', 'trapezius', 'serratus', 'lower-back'] },
  shoulders: { name: 'Shoulders', muscles: ['deltoids'] },
  arms: { name: 'Arms', muscles: ['biceps', 'triceps', 'forearm'] },
  legs: { name: 'Legs', muscles: ['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors', 'hip-flexors', 'tibialis'] },
  core: { name: 'Core', muscles: ['abs', 'obliques'] },
})

/**
 * Calculate overall readiness score and classification category.
 *
 * @param {Record<string, number>} muscleScores Keyed by muscle slug, values 0-100.
 * @returns {{ score: number, category: 'optimal'|'good'|'moderate'|'low' }}
 */
export function calculateOverallReadiness(muscleScores) {
  const values = Object.values(muscleScores || {}).map(Number).filter(Number.isFinite)
  if (!values.length) return { score: 100, category: READINESS_CATEGORIES.OPTIMAL }
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  const min = Math.min(...values)
  // 75% whole-body average readiness + 25% most fatigued muscle bottleneck
  const score = Math.max(0, Math.min(100, Math.round(avg * 0.75 + min * 0.25)))
  const category = score >= 80
    ? READINESS_CATEGORIES.OPTIMAL
    : score >= 60
      ? READINESS_CATEGORIES.GOOD
      : score >= 40
        ? READINESS_CATEGORIES.MODERATE
        : READINESS_CATEGORIES.LOW
  return { score, category }
}

/**
 * Calculate the complete 30-day Muscle Recovery & Readiness Index across all muscle groups.
 *
 * @param {Array<object>} workouts Workout history array.
 * @param {number} [now=Date.now()] Reference timestamp.
 * @param {object} [opts={}] Options passed to fatigueOf (unit, bodyweightKg, etc.).
 * @returns {object}
 */
export function calculateReadinessIndex(workouts = [], now = Date.now(), opts = {}) {
  const list = (workouts || []).filter(w => w && typeof w === 'object')
  const current = Number.isFinite(Number(now)) ? Number(now) : Date.now()
  const fatigue = fatigueOf(list, current, opts)
  const in30d = muscleBalanceWindow(list, 30, current)
  const sets30dMap = loadOfWorkouts(in30d)
  const volume30dMap = volumeOfWorkouts(in30d, opts)
  const lastTrainedMap = latestMuscleTraining(list)

  const muscleReadiness = {}
  const musclesList = []

  for (const slug of MUSCLES) {
    const f = fatigue[slug] || 0
    const readiness = muscleReadinessScore(f)
    muscleReadiness[slug] = readiness
    const state = fatigueStateOf(f)
    const hoursToRecover = calculateMuscleRecoveryHours(f)
    const sets = Math.round((sets30dMap[slug] || 0) * 10) / 10
    const volume = volume30dMap[slug] || 0
    const lastTrained = lastTrainedMap[slug] || null
    const daysSinceTrained = lastTrained ? Math.floor((current - lastTrained) / 86400000) : null

    musclesList.push({
      slug,
      name: MUSCLE_NAME[slug] || slug,
      fatigue: f,
      readiness,
      state,
      hoursToRecover,
      sets30d: sets,
      volume30d: volume,
      lastTrained,
      daysSinceTrained,
    })
  }

  const { score: overallScore, category } = calculateOverallReadiness(muscleReadiness)

  const readyMuscles = musclesList.filter(m => m.state === FATIGUE_STATES.READY)
  const recoveringMuscles = musclesList.filter(m => m.state === FATIGUE_STATES.RECOVERING)
  const fatiguedMuscles = musclesList.filter(m => m.state === FATIGUE_STATES.FATIGUED)

  // Top fresh muscles recommended for training:
  // Pick the freshest muscles distributed across distinct anatomical regions so recommendations
  // suggest balanced target options (e.g. legs, back, shoulders, arms, core).
  const freshRecommendations = []
  for (const reg of Object.values(MUSCLE_REGIONS)) {
    const regionReady = readyMuscles
      .filter(m => reg.muscles.includes(m.slug))
      .sort((a, b) => {
        if (b.readiness !== a.readiness) return b.readiness - a.readiness
        const timeA = a.lastTrained || 0
        const timeB = b.lastTrained || 0
        if (timeA !== timeB) return timeA - timeB
        if ((a.sets30d || 0) !== (b.sets30d || 0)) return (a.sets30d || 0) - (b.sets30d || 0)
        return reg.muscles.indexOf(a.slug) - reg.muscles.indexOf(b.slug)
      })
    if (regionReady.length > 0) {
      freshRecommendations.push(regionReady[0])
    }
  }

  freshRecommendations.sort((a, b) => {
    if (b.readiness !== a.readiness) return b.readiness - a.readiness
    const timeA = a.lastTrained || 0
    const timeB = b.lastTrained || 0
    if (timeA !== timeB) return timeA - timeB
    return (a.sets30d || 0) - (b.sets30d || 0)
  })

  // Focus recovery: muscles needing the most rest, sorted by highest hoursToRecover
  const focusRecovery = musclesList
    .filter(m => m.hoursToRecover > 0)
    .sort((a, b) => b.hoursToRecover - a.hoursToRecover)

  // Regional summary
  const regions = Object.entries(MUSCLE_REGIONS).map(([key, reg]) => {
    const regionMuscles = reg.muscles.map(slug => musclesList.find(m => m.slug === slug)).filter(Boolean)
    const avgReadiness = Math.round(regionMuscles.reduce((sum, m) => sum + m.readiness, 0) / (regionMuscles.length || 1))
    const totalSets = Math.round(regionMuscles.reduce((sum, m) => sum + m.sets30d, 0) * 10) / 10
    const totalVol = regionMuscles.reduce((sum, m) => sum + m.volume30d, 0)
    const maxHours = Math.max(0, ...regionMuscles.map(m => m.hoursToRecover))
    const hasFatigued = regionMuscles.some(m => m.state === FATIGUE_STATES.FATIGUED)
    const hasRecovering = regionMuscles.some(m => m.state === FATIGUE_STATES.RECOVERING)
    const state = hasFatigued ? FATIGUE_STATES.FATIGUED : hasRecovering ? FATIGUE_STATES.RECOVERING : FATIGUE_STATES.READY
    return {
      id: key,
      name: reg.name,
      readiness: avgReadiness,
      state,
      sets30d: totalSets,
      volume30d: totalVol,
      hoursToRecover: maxHours,
      muscleSlugs: reg.muscles,
    }
  })

  let totalWorkSets = 0
  let totalVolume30d = 0
  for (const w of in30d) {
    for (const e of w?.entries || []) {
      for (const s of e?.sets || []) {
        if (s?.done && !isWarmupRow(s)) {
          totalWorkSets++
          const reps = Math.max(0, Number(s.r) || 0)
          const weight = Math.max(0, Number(s.w) || 0)
          const extra = Math.max(0, extraVolumeOf(s))
          totalVolume30d += (weight * reps) + extra
        }
      }
    }
  }

  return {
    overallScore,
    category,
    muscles: musclesList,
    muscleMap: Object.fromEntries(musclesList.map(m => [m.slug, m])),
    readyMuscles,
    recoveringMuscles,
    fatiguedMuscles,
    freshRecommendations,
    focusRecovery,
    regions,
    totalVolume30d,
    totalSets30d: totalWorkSets,
    workoutCount30d: in30d.length,
  }
}
