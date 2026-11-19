import { allExercises, usageMap, matchesMuscleGroup } from './exercises.js'
import { activeProfile, exAvailable } from './equipment.js'
import { bestWeightFor } from './history.js'
import { musclesOf, MUSCLE_NAME } from './muscles.js'

/**
 * High-impact curated anchor exercises across primary muscle groups so new and experienced
 * athletes always receive biomechanically sound recommendations.
 */
const ANCHOR_EXERCISE_IDS = new Set([
  '0025', // Barbell Bench Press
  '0043', // Barbell Full Squat
  '0085', // Barbell Romanian Deadlift
  '0027', // Barbell Bent Over Row
  '0426', // Dumbbell Seated Shoulder Press
  '0652', // Pull-up / Lat Pulldown
  '0310', // Dumbbell Incline Bench Press
  '0179', // Cable Lateral Raise
  '0201', // Cable Pushdown
  '0292'  // Dumbbell Bicep Curl
])

/**
 * Compute personalized exercise recommendations based on:
 * 1. Under-trained / fresh muscle groups over the last 14 days
 * 2. Somatotype alignment (ectomorph = compound focus, mesomorph = balanced PHUL, endomorph = metabolic density)
 * 3. Active gym equipment availability
 * 4. Progressive overload & PR opportunities
 */
export function getExerciseRecommendations(S, { bp = '', limit = 6, excludeIds = [] } = {}) {
  if (!S) return []
  const workouts = S.workouts || []
  const usage = usageMap(S)
  const profile = activeProfile(S)
  const bodyType = S.athleteProfile?.bodyType || 'mesomorph'
  const excluded = new Set(excludeIds)

  // 1. Compute recent 14-day muscle volume load
  const cutoffMs = Date.now() - 14 * 86400000
  const recentMuscleSets = {}
  for (const w of workouts) {
    const wMs = w.start || (w.d ? new Date(w.d).getTime() : 0)
    if (wMs && wMs < cutoffMs) continue
    for (const entry of w.entries || []) {
      const doneCount = (entry.sets || []).filter(s => s.done).length
      if (!doneCount) continue
      const exObj = allExercises(S).find(x => x.id === entry.id)
      if (!exObj) continue
      const mMap = musclesOf(exObj)
      for (const [slug, weight] of Object.entries(mMap)) {
        recentMuscleSets[slug] = (recentMuscleSets[slug] || 0) + weight * doneCount
      }
    }
  }

  const candidates = allExercises(S).filter(ex => {
    if (!ex || excluded.has(ex.id)) return false
    if (bp && bp !== '★' && bp !== '☆' && !matchesMuscleGroup(ex, bp)) return false
    if (profile && !exAvailable(S, ex)) return false
    return true
  })

  const scored = candidates.map(ex => {
    let score = 0
    const mMap = musclesOf(ex)
    const primarySlug = Object.entries(mMap).sort((a, b) => b[1] - a[1])[0]?.[0] || ex.bp
    const recentLoad = primarySlug ? (recentMuscleSets[primarySlug] || 0) : 0
    const best = bestWeightFor(S, ex.id)
    const timesUsed = usage[ex.id] || 0
    const eq = (ex.eq || '').toLowerCase()
    const isCompound = eq === 'barbell' || eq === 'dumbbell' || eq === 'body weight'

    // Favor fresh / under-trained muscles
    if (recentLoad === 0) {
      score += 35
    } else if (recentLoad < 6) {
      score += 20
    } else {
      score -= Math.min(20, recentLoad)
    }

    // Curated anchor bonus so recommendations are top-tier gym movements
    if (ANCHOR_EXERCISE_IDS.has(ex.id)) score += 28

    // Progressive overload opportunity (trained 1-5 times with an established PR)
    if (best > 0 && timesUsed >= 1 && timesUsed <= 8) {
      score += 22
    } else if (timesUsed > 0) {
      score += 10
    }

    // Somatotype alignment
    if (bodyType === 'ectomorph' && (eq === 'barbell' || eq === 'dumbbell')) {
      score += 14
    } else if (bodyType === 'mesomorph' && (isCompound || eq === 'cable')) {
      score += 12
    } else if (bodyType === 'endomorph' && (eq === 'cable' || eq === 'kettlebell' || eq === 'dumbbell' || eq.includes('machine'))) {
      score += 12
    }

    const muscleLabel = MUSCLE_NAME[primarySlug] || ex.tg || ex.bp || 'Full Body'
    let reason = `Fresh Muscle · ${muscleLabel}`
    let tag = 'Recovery Pick'
    let badgeColor = 'var(--acc)'

    if (best > 0) {
      reason = `Overload Target · Beat ${best} ${S.unit || 'kg'}`
      tag = 'PR Opportunity'
      badgeColor = 'var(--amber)'
    } else if (bodyType === 'ectomorph' && eq === 'barbell') {
      reason = `Ectomorph Mass Compound · ${muscleLabel}`
      tag = 'Mass Builder'
      badgeColor = 'var(--blue)'
    } else if (recentLoad === 0) {
      reason = `100% Recovered · ${muscleLabel}`
      tag = 'Fresh Muscle'
      badgeColor = 'var(--acc)'
    }

    return {
      ex,
      id: ex.id,
      name: ex.n,
      score,
      reason,
      tag,
      badgeColor,
      bestWeight: best,
      usageCount: timesUsed,
      targetMuscle: muscleLabel
    }
  })

  // Diversify by target muscle so all 6 recommendations aren't for the same muscle unless filtered by bp
  scored.sort((a, b) => b.score - a.score)
  const picked = []
  const muscleCounts = {}
  for (const item of scored) {
    if (picked.length >= limit) break
    const mKey = item.targetMuscle
    const maxPerMuscle = bp ? limit : 2
    if ((muscleCounts[mKey] || 0) >= maxPerMuscle) continue
    muscleCounts[mKey] = (muscleCounts[mKey] || 0) + 1
    picked.push(item)
  }

  return picked
}
