import { describe, expect, it } from 'vitest'
import { EXIDX } from './exercises.js'
import { GYMMANE_TEMPLATES, allProgramOptions, buildStarterPlan, starterPlanDays, starterPlanOptions, starterRoutines } from './starter.js'

describe('starter plan catalog', () => {
  it('offers the four classic shortcuts and all 10 official GymMane templates', () => {
    expect(starterPlanOptions()).toEqual([
      { id: 'ppl', days: 3 },
      { id: 'upper-lower', days: 4 },
      { id: 'full-body', days: 3 },
      { id: '5x5', days: 2 },
    ])
    expect(allProgramOptions()).toHaveLength(10)
    for (const { id, days } of starterPlanOptions()) expect(starterPlanDays(id)).toHaveLength(days)
  })

  it('changes nothing for an unknown plan id', () => {
    expect(buildStarterPlan('nope')).toBeNull()
    expect(buildStarterPlan(undefined)).toBeNull()
    expect(buildStarterPlan({ type: 'click' })).toBeNull()
    expect(starterPlanDays('nope')).toBeNull()
  })
})

describe.each(GYMMANE_TEMPLATES.map(tpl => tpl.id))('GymMane template: %s', planId => {
  it('references only real GymMane catalog exercises and starts every one at weight 0', () => {
    const built = buildStarterPlan(planId)
    expect(built).toBeTruthy()
    expect(built.routines.length).toBeGreaterThan(0)
    expect(built.schedule.length).toBeGreaterThan(0)
    for (const r of built.routines) {
      for (const e of r.ex) {
        expect(EXIDX[e.id], `${planId}:${e.id}`).toBeTruthy()
        expect(e.sets).toBeGreaterThan(0)
        expect(e.reps).toBeGreaterThan(0)
        expect(e.weight).toBe(0)
      }
    }
  })

  it('mints fresh ids and independent objects on every build', () => {
    const first = buildStarterPlan(planId)
    const second = buildStarterPlan(planId)
    const ids = first.routines.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(second.routines.some(r => ids.includes(r.id))).toBe(false)
    expect(first.routines[0].ex[0]).not.toBe(second.routines[0].ex[0])
    const origSets = first.routines[0].ex[0].sets
    first.routines[0].ex[0].sets = 99
    expect(buildStarterPlan(planId).routines[0].ex[0].sets).toBe(origSets)
  })
})

describe('starterRoutines (the demo build entry point)', () => {
  it('returns GymMane Push, Pull and Legs routines', () => {
    const routines = starterRoutines()
    expect(routines.map(r => r.name)).toEqual(['Push', 'Pull', 'Legs'])
    expect(routines.map(r => r.emoji)).toEqual(['barbell', 'pullup', 'legs'])
    routines.forEach(r => {
      expect(r.ex.length).toBe(5)
      r.ex.forEach(e => expect(EXIDX[e.id], e.id).toBeTruthy())
    })
  })

  it('mints fresh ids on every invocation', () => {
    const first = starterRoutines().map(r => r.id)
    const second = starterRoutines().map(r => r.id)
    expect(new Set([...first, ...second]).size).toBe(6)
  })
})
