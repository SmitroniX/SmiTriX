import { describe, expect, test } from 'vitest'
import { BAR_EQ, DEFAULT_BAR_KG, DEFAULT_BAR_LB, usesBar, defaultBarWeight, barWeightFor, hasBarOverride, plateSplit, calculatePlates, plateDiscsFor } from './bar.js'
import { EXDB } from './exercises-data.js'

const barbellId = EXDB.find(e => e.eq === 'barbell').id

describe('bar equipment', () => {
  test('covers the five bar types and all GymMane barbell exercises', () => {
    expect([...BAR_EQ].sort()).toEqual(['barbell', 'ez barbell', 'olympic barbell', 'smith machine', 'trap bar'])
    expect(EXDB.filter(e => BAR_EQ.has(e.eq)).length).toBeGreaterThanOrEqual(60)
  })

  test('usesBar answers for ids and exercise objects alike', () => {
    expect(usesBar(barbellId)).toBe(true)
    for (const eq of BAR_EQ) {
      expect(usesBar({ eq }), eq).toBe(true)
    }
    expect(usesBar({ eq: 'dumbbell' })).toBe(false)
    expect(usesBar({ eq: 'body weight' })).toBe(false)
    expect(usesBar('no-such-id')).toBe(false)
    expect(usesBar(null)).toBe(false)
  })
})

describe('per-unit defaults', () => {
  test('every bar type has a default in both units', () => {
    for (const eq of BAR_EQ) {
      expect(DEFAULT_BAR_KG[eq], eq).toBeGreaterThan(0)
      expect(DEFAULT_BAR_LB[eq], eq).toBeGreaterThan(0)
    }
    expect(defaultBarWeight('ez barbell', 'kg')).toBe(10)
    expect(defaultBarWeight('ez barbell', 'lb')).toBe(25)
    expect(defaultBarWeight('olympic barbell', 'kg')).toBe(20)
    expect(defaultBarWeight('barbell', 'lb')).toBe(45)
    expect(defaultBarWeight('dumbbell', 'kg')).toBeNull()
  })
})

describe('barWeightFor', () => {
  const altBarbell = EXDB.filter(e => e.eq === 'barbell')[1].id

  test('falls back to the equipment default in the profile unit', () => {
    expect(barWeightFor({ unit: 'kg', barWeights: {} }, barbellId)).toBe(20)
    expect(barWeightFor({ unit: 'lb', barWeights: {} }, barbellId)).toBe(45)
    expect(barWeightFor({ unit: 'kg' }, { id: 'ez-custom', eq: 'ez barbell' })).toBe(10)
  })

  test('an explicit override wins over the default', () => {
    const S = { unit: 'kg', barWeights: { [altBarbell]: 15 } }
    expect(barWeightFor(S, altBarbell)).toBe(15)
    expect(hasBarOverride(S, altBarbell)).toBe(true)
    expect(barWeightFor(S, barbellId)).toBe(20)
    expect(hasBarOverride(S, barbellId)).toBe(false)
  })

  test('a cleared (deleted or zeroed) override falls back to the default', () => {
    const S = { unit: 'kg', barWeights: { [altBarbell]: 12.5 } }
    delete S.barWeights[altBarbell]
    expect(barWeightFor(S, altBarbell)).toBe(20)
    expect(barWeightFor({ unit: 'kg', barWeights: { [altBarbell]: 0 } }, altBarbell)).toBe(20)
    expect(hasBarOverride({ unit: 'kg', barWeights: { [altBarbell]: 0 } }, altBarbell)).toBe(false)
  })

  test('is null for anything without a bar', () => {
    const dumbbell = EXDB.find(e => e.eq === 'dumbbell')
    expect(barWeightFor({ unit: 'kg', barWeights: {} }, dumbbell.id)).toBeNull()
    expect(barWeightFor({ unit: 'kg', barWeights: {} }, 'no-such-id')).toBeNull()
  })
})

describe('plateSplit', () => {
  test('splits what is beyond the bar evenly per side', () => {
    expect(plateSplit(62.5, 20)).toBe(21.25)
    expect(plateSplit(100, 20)).toBe(40)
    expect(plateSplit(30, 10)).toBe(10)
  })

  test('rounds to 2 decimals', () => {
    expect(plateSplit(60.333, 20)).toBe(20.17)
  })

  test('returns null when total is at or below bar weight', () => {
    expect(plateSplit(20, 20)).toBeNull()
    expect(plateSplit(15, 20)).toBeNull()
    expect(plateSplit(0, 20)).toBeNull()
  })
})

describe('calculatePlates & plateDiscsFor', () => {
  test('builds greedy plate stack per side in kg and lb', () => {
    expect(calculatePlates(40, 'kg').map(p => [p.weight, p.count])).toEqual([[25, 1], [15, 1]])
    expect(calculatePlates(45, 'lb').map(p => [p.weight, p.count])).toEqual([[45, 1]])
    expect(plateDiscsFor(100, 20, 'kg').map(p => [p.weight, p.count])).toEqual([[25, 1], [15, 1]])
    expect(plateDiscsFor(20, 20, 'kg')).toEqual([])
  })
})
