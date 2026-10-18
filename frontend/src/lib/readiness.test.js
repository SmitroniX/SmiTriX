import { describe, expect, it } from 'vitest'
import {
  calculateMuscleRecoveryHours,
  muscleReadinessScore,
  latestMuscleTraining,
  volumeOfWorkouts,
  calculateOverallReadiness,
  calculateReadinessIndex,
  READINESS_CATEGORIES,
  READY_FATIGUE_THRESHOLD,
  MUSCLE_REGIONS,
} from './readiness.js'
import { MUSCLES } from './muscles.js'
import { FATIGUE_STATES } from './recovery.js'

describe('calculateMuscleRecoveryHours', () => {
  it('returns 0 for fatigue at or below the ready threshold (0.25)', () => {
    expect(calculateMuscleRecoveryHours(0)).toBe(0)
    expect(calculateMuscleRecoveryHours(0.1)).toBe(0)
    expect(calculateMuscleRecoveryHours(0.24)).toBe(0)
    expect(calculateMuscleRecoveryHours(0.25)).toBe(0)
  })

  it('returns 0 for non-finite or empty inputs', () => {
    expect(calculateMuscleRecoveryHours(null)).toBe(0)
    expect(calculateMuscleRecoveryHours(undefined)).toBe(0)
    expect(calculateMuscleRecoveryHours(NaN)).toBe(0)
    expect(calculateMuscleRecoveryHours(-0.5)).toBe(0)
  })

  it('calculates mathematically sound recovery hours for recovering and fatigued levels', () => {
    // At fatigue = 0.5 (fatigued boundary), decay to 0.25 takes ~45.7 hours with 36h half-life
    const hours50 = calculateMuscleRecoveryHours(0.5)
    expect(hours50).toBeGreaterThan(40)
    expect(hours50).toBeLessThan(50)
    expect(hours50).toBeCloseTo(45.7, 0)

    // At fatigue = 0.35 (mildly recovering), takes ~21 hours
    const hours35 = calculateMuscleRecoveryHours(0.35)
    expect(hours35).toBeGreaterThan(15)
    expect(hours35).toBeLessThan(25)
    expect(hours35).toBeCloseTo(21.0, 0)

    // Higher fatigue requires strictly more recovery time
    const hours75 = calculateMuscleRecoveryHours(0.75)
    expect(hours75).toBeGreaterThan(hours50)
  })

  it('scales proportionally with custom half-life', () => {
    const normal = calculateMuscleRecoveryHours(0.5, 36 * 3600 * 1000)
    const double = calculateMuscleRecoveryHours(0.5, 72 * 3600 * 1000)
    expect(double).toBeCloseTo(normal * 2, 0)
  })

  it('clamps extreme fatigue near 1.0 safely without returning Infinity or NaN', () => {
    const hoursNear1 = calculateMuscleRecoveryHours(0.99999)
    expect(Number.isFinite(hoursNear1)).toBe(true)
    expect(hoursNear1).toBeGreaterThan(100)
  })
})

describe('muscleReadinessScore', () => {
  it('maps 0 fatigue to 100% readiness', () => {
    expect(muscleReadinessScore(0)).toBe(100)
  })

  it('maps 0.25 fatigue to 75% readiness', () => {
    expect(muscleReadinessScore(0.25)).toBe(75)
  })

  it('maps 0.5 fatigue to 50% readiness', () => {
    expect(muscleReadinessScore(0.5)).toBe(50)
  })

  it('handles invalid inputs gracefully', () => {
    expect(muscleReadinessScore(null)).toBe(100)
    expect(muscleReadinessScore(undefined)).toBe(100)
    expect(muscleReadinessScore('invalid')).toBe(100)
  })

  it('clamps out of range values to [0, 100]', () => {
    expect(muscleReadinessScore(-0.2)).toBe(100)
    expect(muscleReadinessScore(1.5)).toBe(0)
  })
})

describe('latestMuscleTraining', () => {
  it('returns empty record when workouts is empty', () => {
    expect(latestMuscleTraining([])).toEqual({})
  })

  it('extracts latest timestamp per muscle across workouts', () => {
    const t1 = Date.UTC(2026, 9, 10, 10, 0)
    const t2 = Date.UTC(2026, 9, 12, 10, 0)

    const workouts = [
      {
        start: t1,
        entries: [
          {
            id: 'bench-press',
            exercise: { tg: 'chest', sm: 'triceps', bp: 'chest' },
            sets: [{ done: true, w: 80, r: 10 }],
          },
        ],
      },
      {
        start: t2,
        entries: [
          {
            id: 'bench-press',
            exercise: { tg: 'chest', sm: 'triceps', bp: 'chest' },
            sets: [{ done: true, w: 90, r: 8 }],
          },
        ],
      },
    ]

    const latest = latestMuscleTraining(workouts)
    expect(latest.chest).toBe(t2)
    expect(latest.triceps).toBe(t2)
  })

  it('ignores sets that were not completed or are warmup rows', () => {
    const t1 = Date.UTC(2026, 9, 10)
    const workouts = [
      {
        start: t1,
        entries: [
          {
            id: 'squat',
            exercise: { tg: 'quads', bp: 'upper legs' },
            sets: [
              { done: false, w: 100, r: 5 },
              { done: true, warmup: true, w: 40, r: 10 },
              { done: true, phase: 'warmup', w: 60, r: 5 },
            ],
          },
        ],
      },
    ]

    const latest = latestMuscleTraining(workouts)
    expect(latest.quadriceps).toBeUndefined()
  })
})

describe('volumeOfWorkouts', () => {
  it('calculates tonnage correctly across sets including drop sets', () => {
    const workouts = [
      {
        entries: [
          {
            id: 'bench-press',
            exercise: { tg: 'chest', bp: 'chest' },
            sets: [
              { done: true, w: 100, r: 10 }, // 1000 kg
              {
                done: true,
                type: 'dropset',
                w: 80,
                r: 8,
                drops: [{ w: 60, r: 6 }], // 80*8 + 60*6 = 640 + 360 = 1000 kg
              },
            ],
          },
        ],
      },
    ]

    const vols = volumeOfWorkouts(workouts)
    expect(vols.chest).toBe(2000)
  })

  it('ignores warmup sets in volume calculations', () => {
    const workouts = [
      {
        entries: [
          {
            id: 'squat',
            exercise: { tg: 'quads', bp: 'upper legs' },
            sets: [
              { done: true, phase: 'warmup', w: 60, r: 10 },
              { done: true, w: 100, r: 5 }, // 500 kg
            ],
          },
        ],
      },
    ]

    const vols = volumeOfWorkouts(workouts)
    expect(vols.quadriceps).toBe(500)
  })
})

describe('calculateOverallReadiness', () => {
  it('returns 100 and optimal for empty input', () => {
    const res = calculateOverallReadiness({})
    expect(res.score).toBe(100)
    expect(res.category).toBe(READINESS_CATEGORIES.OPTIMAL)
  })

  it('classifies categories according to threshold bands', () => {
    // >= 80 -> optimal
    expect(calculateOverallReadiness({ a: 90, b: 85 }).category).toBe(READINESS_CATEGORIES.OPTIMAL)
    // 60-79 -> good
    expect(calculateOverallReadiness({ a: 70, b: 70 }).category).toBe(READINESS_CATEGORIES.GOOD)
    // 40-59 -> moderate
    expect(calculateOverallReadiness({ a: 50, b: 50 }).category).toBe(READINESS_CATEGORIES.MODERATE)
    // < 40 -> low
    expect(calculateOverallReadiness({ a: 30, b: 30 }).category).toBe(READINESS_CATEGORIES.LOW)
  })
})

describe('calculateReadinessIndex', () => {
  it('handles empty workouts cleanly with 100% readiness across all 18 muscles', () => {
    const now = Date.UTC(2026, 9, 15, 12, 0)
    const res = calculateReadinessIndex([], now)

    expect(res.overallScore).toBe(100)
    expect(res.category).toBe(READINESS_CATEGORIES.OPTIMAL)
    expect(res.muscles).toHaveLength(18)
    expect(res.readyMuscles).toHaveLength(18)
    expect(res.recoveringMuscles).toHaveLength(0)
    expect(res.fatiguedMuscles).toHaveLength(0)
    expect(res.focusRecovery).toHaveLength(0)
    expect(res.totalVolume30d).toBe(0)
    expect(res.totalSets30d).toBe(0)
    expect(res.workoutCount30d).toBe(0)

    // All muscles have readiness 100 and 0 recovery hours
    for (const m of res.muscles) {
      expect(m.readiness).toBe(100)
      expect(m.state).toBe(FATIGUE_STATES.READY)
      expect(m.hoursToRecover).toBe(0)
      expect(m.sets30d).toBe(0)
      expect(m.volume30d).toBe(0)
    }

    // Regional breakdown is present
    expect(res.regions.length).toBe(Object.keys(MUSCLE_REGIONS).length)
    for (const reg of res.regions) {
      expect(reg.readiness).toBe(100)
      expect(reg.state).toBe(FATIGUE_STATES.READY)
    }
  })

  it('calculates fatigue, recovery time, and 30-day volume after training', () => {
    const now = Date.UTC(2026, 9, 15, 12, 0)
    const workoutTime = now - 12 * 3600 * 1000 // 12 hours ago

    const workouts = [
      {
        start: workoutTime,
        d: '2026-10-15',
        entries: [
          {
            id: 'bench-press',
            exercise: { tg: 'chest', sm: 'triceps', bp: 'chest' },
            sets: [
              { done: true, w: 100, r: 10 },
              { done: true, w: 100, r: 10 },
              { done: true, w: 100, r: 10 },
            ],
          },
        ],
      },
    ]

    const res = calculateReadinessIndex(workouts, now)

    expect(res.workoutCount30d).toBe(1)
    expect(res.totalSets30d).toBe(3)
    expect(res.totalVolume30d).toBe(3000)

    const chest = res.muscleMap.chest
    expect(chest).toBeDefined()
    expect(chest.sets30d).toBe(3)
    expect(chest.volume30d).toBe(3000)
    expect(chest.fatigue).toBeGreaterThan(0)
    expect(chest.readiness).toBeLessThan(100)
    expect(chest.lastTrained).toBe(workoutTime)

    // Secondary muscle (triceps) also receives volume and stimulus
    const triceps = res.muscleMap.triceps
    expect(triceps.sets30d).toBeCloseTo(1.2, 1)
    expect(triceps.volume30d).toBeCloseTo(1200, 0)

    // Untrained muscles remain 100% ready
    const quads = res.muscleMap.quadriceps
    expect(quads.readiness).toBe(100)
    expect(quads.state).toBe(FATIGUE_STATES.READY)
    expect(quads.hoursToRecover).toBe(0)

    // freshRecommendations suggests fresh muscles
    expect(res.freshRecommendations.length).toBeGreaterThan(0)
    expect(res.freshRecommendations.some(m => m.slug === 'quadriceps')).toBe(true)

    // Regions reflect targeted regions
    const chestRegion = res.regions.find(r => r.id === 'chest')
    expect(chestRegion.volume30d).toBe(3000)
  })

  it('excludes workouts older than 30 days from 30d rolling metrics', () => {
    const now = Date.UTC(2026, 9, 15, 12, 0)
    const oldWorkoutTime = now - 35 * 86400000 // 35 days ago

    const workouts = [
      {
        start: oldWorkoutTime,
        d: '2026-09-10',
        entries: [
          {
            id: 'deadlift',
            exercise: { tg: 'lower back', sm: 'hamstrings', bp: 'back' },
            sets: [{ done: true, w: 150, r: 5 }],
          },
        ],
      },
    ]

    const res = calculateReadinessIndex(workouts, now)
    expect(res.workoutCount30d).toBe(0)
    expect(res.totalVolume30d).toBe(0)
    expect(res.totalSets30d).toBe(0)
    expect(res.muscleMap['lower-back'].sets30d).toBe(0)
    expect(res.muscleMap['lower-back'].volume30d).toBe(0)
  })
})
