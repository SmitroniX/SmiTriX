// @vitest-environment happy-dom
/** @license AGPL-3.0-or-later */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { REST_CHIMES, beep, playRestChime, vibrate, getAudioContext } from './sound.js'

describe('sound module & rest chimes synthesizer', () => {
  let originalAudioContext
  let lastMockCtx = null

  beforeEach(() => {
    originalAudioContext = window.AudioContext
    class MockAudioContext {
      constructor() {
        this.currentTime = 0
        this.state = 'running'
        this.destination = {}
        this.createOscillator = vi.fn().mockImplementation(() => ({
          type: 'sine',
          frequency: { value: 440, setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }))
        this.createGain = vi.fn().mockImplementation(() => ({
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        }))
        this.resume = vi.fn().mockResolvedValue(undefined)
        lastMockCtx = this
      }
    }
    window.AudioContext = MockAudioContext
  })

  afterEach(() => {
    window.AudioContext = originalAudioContext
    vi.restoreAllMocks()
  })

  it('exports the 4 customizable rest timer chimes', () => {
    expect(REST_CHIMES).toHaveLength(4)
    const ids = REST_CHIMES.map(c => c.id)
    expect(ids).toContain('bell')
    expect(ids).toContain('beeps')
    expect(ids).toContain('gong')
    expect(ids).toContain('digital')
  })

  it('beep plays audio when enabled', () => {
    beep(true, 880, 0.2)
    const ctx = getAudioContext()
    expect(ctx.createOscillator).toHaveBeenCalled()
    expect(ctx.createGain).toHaveBeenCalled()
  })

  it('beep does nothing when enabled is false', () => {
    const ctx = getAudioContext()
    const callCount = ctx.createOscillator.mock.calls.length
    beep(false, 880, 0.2)
    expect(ctx.createOscillator.mock.calls.length).toBe(callCount)
  })

  it('playRestChime plays bell chime', () => {
    const ctx = getAudioContext()
    ctx.createOscillator.mockClear()
    playRestChime('bell', true)
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('playRestChime plays gong chime', () => {
    const ctx = getAudioContext()
    ctx.createOscillator.mockClear()
    playRestChime('gong', true)
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('playRestChime plays digital chime', () => {
    const ctx = getAudioContext()
    ctx.createOscillator.mockClear()
    playRestChime('digital', true)
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('playRestChime plays countdown beeps chime', () => {
    const ctx = getAudioContext()
    ctx.createOscillator.mockClear()
    playRestChime('beeps', true)
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('playRestChime does not play when sound is disabled', () => {
    const ctx = getAudioContext()
    ctx.createOscillator.mockClear()
    playRestChime('bell', false)
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('vibrate calls navigator.vibrate safely', () => {
    const origVibrate = navigator.vibrate
    navigator.vibrate = vi.fn()
    vibrate([20, 30, 20])
    expect(navigator.vibrate).toHaveBeenCalledWith([20, 30, 20])
    navigator.vibrate = origVibrate
  })

  it('getAudioContext recreates context if closed', () => {
    const ctx1 = getAudioContext()
    ctx1.state = 'closed'
    const ctx2 = getAudioContext()
    expect(ctx2).not.toBe(ctx1)
  })
})
