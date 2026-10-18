import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'

const mocks = vi.hoisted(() => {
  const state = {
    S: null,
    timer: null,
    work: null,
    startRest: vi.fn(),
    stopRest: vi.fn(),
    stopWork: vi.fn(),
    toast: vi.fn(),
    scrollCalls: [],
  }
  state.storeSnapshot = () => ({
    S: state.S,
    user: null,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
  })
  state.uiSnapshot = () => ({
    timer: state.timer,
    work: state.work,
    startRest: state.startRest,
    stopRest: state.stopRest,
    stopWork: state.stopWork,
    shiftRestOwner: vi.fn(),
    startWork: vi.fn(),
    toast: state.toast,
  })
  return state
})

vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector(mocks.storeSnapshot())
  useStore.getState = mocks.storeSnapshot
  return { useStore }
})
vi.mock('../store/useUI.js', () => {
  const useUI = selector => selector ? selector(mocks.uiSnapshot()) : mocks.uiSnapshot()
  useUI.getState = mocks.uiSnapshot
  return { useUI }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  startFlow: vi.fn(), exercisePicker: vi.fn(), exConfigSheet: vi.fn(), exerciseDetailSheet: vi.fn(),
  topWeightSheet: vi.fn(), finishWorkout: vi.fn(), workoutCompleteSheet: vi.fn(), confirmSheet: vi.fn(),
  swapActiveWorkoutExercise: vi.fn(), menuSheet: vi.fn(), barWeightSheet: vi.fn(), plateCalculatorSheet: vi.fn(),
  exerciseNoteSheet: vi.fn(), sessionNoteSheet: vi.fn(), effortPickerSheet: vi.fn(), exerciseHistorySheet: vi.fn(),
}))
vi.mock('../components/Media.jsx', () => ({ default: () => null }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(() => Promise.resolve({})),
  IS_APPLE: false, IS_ANDROID: false, BIO: 'biometrics',
}))

let dom
let root
let container

function workout(entries, cur = 0, overrides = {}) {
  const { active: activeOverrides = {}, ...stateOverrides } = overrides
  return {
    unit: 'kg', restSec: 90, sound: false, effort: 'none', gifSize: 'full',
    workoutDensity: 'spacious', restChime: 'bell',
    workouts: [], exWeights: {}, routines: [],
    active: { id: 'active', name: 'Test workout', start: Date.now(), cur, entries, ...activeOverrides },
    ...stateOverrides,
  }
}

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event', 'Blob']) globalThis[key] = dom[key]
  dom.Element.prototype.scrollIntoView = vi.fn(function (options) {
    mocks.scrollCalls.push({ node: this, options })
  })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

async function mount(entries, cur = 0, overrides = {}) {
  mocks.S = workout(entries, cur, overrides)
  installDom()
  await act(async () => { root.render(React.createElement(Workout)) })
}

async function unmount() {
  if (!root) return
  await act(async () => { root.unmount() })
  root = null
  container = null
  dom = null
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.scrollCalls.length = 0
})

afterEach(async () => {
  await unmount()
})

describe('Workout UI/UX Enhancements', () => {
  it('applies workout-compact density class when workoutDensity is compact', async () => {
    await mount(
      [{ id: '0025', target: { mode: 'reps', weight: 60, reps: 5 }, sets: [{ w: 60, r: 5, done: false }] }],
      0,
      { workoutDensity: 'compact' }
    )

    const wrapper = container.querySelector('.narrow')
    expect(wrapper).toBeTruthy()
    expect(wrapper.classList.contains('workout-compact')).toBe(true)
  })

  it('does not apply workout-compact density class when workoutDensity is spacious', async () => {
    await mount(
      [{ id: '0025', target: { mode: 'reps', weight: 60, reps: 5 }, sets: [{ w: 60, r: 5, done: false }] }],
      0,
      { workoutDensity: 'spacious' }
    )

    const wrapper = container.querySelector('.narrow')
    expect(wrapper).toBeTruthy()
    expect(wrapper.classList.contains('workout-compact')).toBe(false)
  })

  it('renders Olympic plate preview discs on barbell exercises', async () => {
    await mount(
      [{ id: '0025', target: { mode: 'reps', weight: 100, reps: 5 }, sets: [{ w: 100, r: 5, done: false }] }],
      0
    )

    // Check plate trigger button contains plate preview discs
    const plateTrigger = container.querySelector('.plate-calc-trigger')
    expect(plateTrigger).toBeTruthy()
    const discs = plateTrigger.querySelectorAll('.plate-disc-badge')
    expect(discs.length).toBeGreaterThan(0)
    expect(discs[0].textContent).toBe('25')
  })

  it('celebrates new 1RM record with golden PR banner, golden toast, and dismiss button', async () => {
    // 0025 (bench press) has an existing history of 60kg for 5 reps (est 1RM = 67.5kg)
    await mount(
      [{ id: '0025', target: { mode: 'reps', weight: 100, reps: 5 }, sets: [{ w: 100, r: 5, done: false }] }],
      0,
      {
        workouts: [
          {
            d: '2026-10-01',
            entries: [{ id: '0025', sets: [{ w: 60, r: 5, done: true }] }],
          },
        ],
      }
    )

    expect(container.querySelector('.golden-pr-banner')).toBeNull()

    // Check off the 100kg x 5 set (est 1RM = ~112.5kg > 67.5kg)
    const checkbox = container.querySelector('[role="checkbox"]')
    await act(async () => {
      checkbox.dispatchEvent(new dom.Event('click', { bubbles: true }))
    })

    // Expect golden PR banner to appear
    const prBanner = container.querySelector('.golden-pr-banner')
    expect(prBanner).toBeTruthy()
    expect(prBanner.textContent).toContain('NEW 1RM RECORD!')
    expect(prBanner.textContent).toContain('100 kg × 5 reps')

    // Expect toast notification
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('New 1RM PR'))

    // Dismiss banner
    const closeBtn = prBanner.querySelector('.golden-pr-close')
    expect(closeBtn).toBeTruthy()
    await act(async () => {
      closeBtn.dispatchEvent(new dom.Event('click', { bubbles: true }))
    })
    expect(container.querySelector('.golden-pr-banner')).toBeNull()
  })

  it('auto-advances focus to the next incomplete set after check-off', async () => {
    await mount(
      [{ id: '0025', target: { mode: 'reps', weight: 60, reps: 5 }, sets: [{ w: 60, r: 5, done: false }, { w: 60, r: 5, done: false }] }],
      0
    )

    const focusSpy = vi.fn()
    dom.HTMLElement.prototype.focus = focusSpy

    const checkbox = container.querySelectorAll('[role="checkbox"]')[0]
    await act(async () => {
      checkbox.dispatchEvent(new dom.Event('click', { bubbles: true }))
    })

    // Wait for auto-scroll / auto-focus timeout (120ms)
    await new Promise(r => setTimeout(r, 160))
    expect(focusSpy).toHaveBeenCalled()
  })

  it('does not re-trigger duplicate PR celebration on subsequent set with same weight/reps', async () => {
    // 0025 history: 60kg for 5 reps
    await mount(
      [{ id: '0025', target: { mode: 'reps', weight: 100, reps: 5 }, sets: [{ w: 100, r: 5, done: false }, { w: 100, r: 5, done: false }] }],
      0,
      {
        workouts: [
          {
            d: '2026-10-01',
            entries: [{ id: '0025', sets: [{ w: 60, r: 5, done: true }] }],
          },
        ],
      }
    )

    // Check off Set 1 -> triggers PR
    const checkboxes = container.querySelectorAll('[role="checkbox"]')
    await act(async () => {
      checkboxes[0].dispatchEvent(new dom.Event('click', { bubbles: true }))
    })

    expect(mocks.toast).toHaveBeenCalledTimes(1)
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('New 1RM PR'))
    mocks.toast.mockClear()

    // Check off Set 2 (100kg x 5, same as Set 1) -> must NOT trigger PR again
    await act(async () => {
      checkboxes[1].dispatchEvent(new dom.Event('click', { bubbles: true }))
    })

    expect(mocks.toast).not.toHaveBeenCalled()
  })

  it('celebrates new Reps PR on bodyweight exercise when beating prior reps record', async () => {
    // 0652 is pull-up (bodyweight exercise)
    await mount(
      [{ id: '0652', target: { mode: 'reps', reps: 15 }, sets: [{ w: 0, r: 15, done: false }] }],
      0,
      {
        workouts: [
          {
            d: '2026-10-01',
            entries: [{ id: '0652', sets: [{ w: 0, r: 10, done: true }] }],
          },
        ],
      }
    )

    const checkbox = container.querySelector('[role="checkbox"]')
    await act(async () => {
      checkbox.dispatchEvent(new dom.Event('click', { bubbles: true }))
    })

    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('New Reps PR'))
    const prBanner = container.querySelector('.golden-pr-banner')
    expect(prBanner).toBeTruthy()
    expect(prBanner.textContent).toContain('NEW REPS RECORD!')
    expect(prBanner.textContent).toContain('15 reps')
  })

  it('auto-scrolls back to incomplete earlier set when a later set is checked first', async () => {
    await mount(
      [{ id: '0025', target: { mode: 'reps', weight: 60, reps: 5 }, sets: [{ w: 60, r: 5, done: false }, { w: 60, r: 5, done: false }] }],
      0
    )

    const focusSpy = vi.fn()
    dom.HTMLElement.prototype.focus = focusSpy

    // Check off Set 2 (index 1) while Set 1 (index 0) remains undone
    const checkboxes = container.querySelectorAll('[role="checkbox"]')
    await act(async () => {
      checkboxes[1].dispatchEvent(new dom.Event('click', { bubbles: true }))
    })

    await new Promise(r => setTimeout(r, 160))
    expect(focusSpy).toHaveBeenCalled()
  })
})
