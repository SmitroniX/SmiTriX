import { describe, expect, it } from 'vitest'
import {
  MEASURE_KEYS,
  measureSeriesFor,
  measureDeltaFor,
  nextRotationRoutine,
  PLACE_PRESETS,
  buildAiPlanPrompt,
  parseAiPlanText,
} from './gymmane-measures.js'

describe('gymmane-measures', () => {
  it('defines 10 standard body measures and 3 place presets', () => {
    expect(MEASURE_KEYS).toHaveLength(10)
    expect(PLACE_PRESETS).toHaveLength(3)
  })

  it('sorts series and computes deltas accurately', () => {
    const list = [
      { key: 'waist', val: 81.2, t: 200 },
      { key: 'waist', val: 82.5, t: 100 },
      { key: 'chest', val: 101, t: 150 },
    ]
    const series = measureSeriesFor(list, 'waist')
    expect(series.map(x => x.val)).toEqual([82.5, 81.2])
    expect(measureDeltaFor(list, 'waist')).toBe(-1.3)
    expect(measureDeltaFor(list, 'chest')).toBeNull()
  })

  it('resolves next routine or rest step in rotation schedules', () => {
    const S = {
      routines: [{ id: 'r1', name: 'Push' }, { id: 'r2', name: 'Pull' }],
      rotationSteps: [{ type: 'routine', id: 'r1' }, { type: 'rest' }, { type: 'routine', id: 'r2' }],
      rotationStep: 1,
    }
    expect(nextRotationRoutine(S)).toEqual({ isRest: true, index: 1, total: 3 })
    expect(nextRotationRoutine({ ...S, rotationStep: 2 }).routine.name).toBe('Pull')
    expect(nextRotationRoutine({ ...S, rotationStep: 3 }).routine.name).toBe('Push')
  })

  it('builds and parses offline AI workout plans', () => {
    const prompt = buildAiPlanPrompt({ unit: 'kg', routines: [{ name: 'Push' }] })
    expect(prompt).toContain('Push')

    const parsed = parseAiPlanText([
      '## Routine: Upper A',
      '- Barbell Bench Press | 4x8',
      '- Pull-Up | 3x10',
      '## Lower A',
      '1. Barbell Squat | 4x6',
    ].join('\n'))
    expect(parsed).toHaveLength(2)
    expect(parsed[0].name).toBe('Upper A')
    expect(parsed[0].items).toHaveLength(2)
    expect(parsed[0].items[0]).toEqual({ name: 'Barbell Bench Press', sets: 4, reps: 8 })
    expect(parsed[1].items[0]).toEqual({ name: 'Barbell Squat', sets: 4, reps: 6 })
  })
})
