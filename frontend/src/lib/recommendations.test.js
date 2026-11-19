// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { getExerciseRecommendations } from './recommendations.js'
import { DEF } from '../store/useStore.js'

describe('Smart Exercise Recommendations Engine', () => {
  it('returns diverse recommendations for a fresh profile', () => {
    const recs = getExerciseRecommendations({ ...DEF, workouts: [] }, { limit: 6 })
    expect(recs.length).toBe(6)
    expect(recs[0]).toHaveProperty('id')
    expect(recs[0]).toHaveProperty('reason')
    expect(recs[0]).toHaveProperty('tag')
  })

  it('identifies PR Opportunity when user has prior bestWeight on an exercise', () => {
    const state = {
      ...DEF,
      exWeights: { '0025': { w: 100, d: '2026-11-01' } },
      workouts: [
        {
          id: 'w1',
          d: '2026-11-01',
          entries: [{ id: '0025', sets: [{ w: 100, r: 8, done: true }] }]
        }
      ]
    }
    const recs = getExerciseRecommendations(state, { bp: 'chest', limit: 4 })
    const bench = recs.find(r => r.id === '0025')
    expect(bench).toBeTruthy()
    expect(bench.tag).toBe('PR Opportunity')
    expect(bench.bestWeight).toBe(100)
  })

  it('filters recommendations by muscle group when bp is specified', () => {
    const recs = getExerciseRecommendations({ ...DEF }, { bp: 'back', limit: 4 })
    expect(recs.length).toBeGreaterThan(0)
    for (const r of recs) {
      expect(r.ex.bp === 'back' || r.targetMuscle.toLowerCase().includes('back') || r.targetMuscle.toLowerCase().includes('lat')).toBe(true)
    }
  })
})
