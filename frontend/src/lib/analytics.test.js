// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { hasAnalyticsConsent, setAnalyticsConsent } from './analytics.js'

describe('Analytics & Privacy Consent Infrastructure', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to true when consent not explicitly disabled', () => {
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('respects user opt-out choice', () => {
    setAnalyticsConsent(false)
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('allows user to re-enable consent', () => {
    setAnalyticsConsent(false)
    expect(hasAnalyticsConsent()).toBe(false)
    setAnalyticsConsent(true)
    expect(hasAnalyticsConsent()).toBe(true)
  })
})
