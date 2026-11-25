import { describe, expect, it } from 'vitest'
import { ART_BOUNDS, ART_SLUGS, resolveExerciseArtSlug } from './exercise-art.js'
import { EXDB } from './exercises-data.js'

describe('GymMane exercise vector art manifest & matcher', () => {
  it('bundles all 394 exercise animation slugs with valid padded viewBox bounds', () => {
    expect(ART_SLUGS.length).toBe(394)
    for (const slug of ART_SLUGS) {
      const b = ART_BOUNDS[slug]
      expect(Array.isArray(b)).toBe(true)
      expect(b.length).toBe(4)
      expect(b[2]).toBeGreaterThan(0)
      expect(b[3]).toBeGreaterThan(0)
    }
  })

  it('matches canonical exercises to exact GymMane slugs', () => {
    expect(resolveExerciseArtSlug({ id: '1', n: 'barbell bench press', bp: 'chest', eq: 'barbell' })).toBe('bench-press')
    expect(resolveExerciseArtSlug({ id: '2', n: 'barbell full squat', bp: 'upper legs', eq: 'barbell' })).toBe('squat')
    expect(resolveExerciseArtSlug({ id: '3', n: 'barbell deadlift', bp: 'upper legs', eq: 'barbell' })).toBe('deadlift')
    expect(resolveExerciseArtSlug({ id: '4', n: 'cable lat pulldown', bp: 'back', eq: 'cable' })).toBe('lat-pulldown')
    expect(resolveExerciseArtSlug({ id: '5', n: 'dumbbell lateral raise', bp: 'shoulders', eq: 'dumbbell' })).toBe('lateral-raise')
    expect(resolveExerciseArtSlug({ id: '6', n: 'front plank', bp: 'waist', eq: 'body weight' })).toBe('plank')
  })

  it('resolves a valid vector art slug or sport icon for every built-in EXDB exercise', () => {
    const slugSet = new Set(ART_SLUGS)
    for (const ex of EXDB) {
      const slug = resolveExerciseArtSlug(ex)
      if (ex.sportIcon && !ex.art) {
        expect(ex.sportIcon).toBeTruthy()
      } else {
        expect(slug, ex.id).toBeTruthy()
        expect(slugSet.has(slug), `${ex.id}:${slug}`).toBe(true)
      }
    }
  })
})
