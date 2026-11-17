import { describe, it, expect } from 'vitest'
import { PLANS, getPlanById, getFreePlan, getLegacyPlan, isFeatureAllowed } from './subscription-plans.js'

describe('Subscription & Feature Plans Architecture', () => {
  it('defines distinct Free Plan and Legacy Plan', () => {
    expect(PLANS.length).toBeGreaterThanOrEqual(2)
    const free = getFreePlan()
    const legacy = getLegacyPlan()

    expect(free).toBeDefined()
    expect(free.id).toBe('free')
    expect(free.isLegacy).toBe(false)
    expect(free.price).toBe('$0')

    expect(legacy).toBeDefined()
    expect(legacy.id).toBe('legacy')
    expect(legacy.isLegacy).toBe(true)
    expect(legacy.price).toBe('Lifetime')
  })

  it('clearly outlines features, benefits and limitations for both tiers', () => {
    const free = getFreePlan()
    const legacy = getLegacyPlan()

    expect(free.features.length).toBeGreaterThan(5)
    expect(free.benefits.length).toBeGreaterThan(0)
    expect(free.limitations.length).toBeGreaterThan(0)

    expect(legacy.features.length).toBeGreaterThan(5)
    expect(legacy.benefits.length).toBeGreaterThan(0)
    expect(legacy.limitations.length).toBeGreaterThan(0)
  })

  it('differentiates current vs legacy capabilities', () => {
    expect(isFeatureAllowed('free', 'unlimited_workouts')).toBe(true)
    expect(isFeatureAllowed('free', 'legend_splits')).toBe(false)

    expect(isFeatureAllowed('legacy', 'unlimited_workouts')).toBe(true)
    expect(isFeatureAllowed('legacy', 'legend_splits')).toBe(true)
    expect(isFeatureAllowed('legacy', 'somatotype_engine')).toBe(true)
  })

  it('handles unknown plan fallback gracefully', () => {
    const fallback = getPlanById('non_existent')
    expect(fallback).toBeDefined()
    expect(fallback.id).toBe('free')
  })
})
