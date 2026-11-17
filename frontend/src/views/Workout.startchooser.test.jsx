import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'
import { DEF } from '../store/useStore.js'

const mocks = vi.hoisted(() => {
  const state = {
    S: null,
    timer: null,
    work: null,
    startRest: vi.fn(),
    stopRest: vi.fn(),
    stopWork: vi.fn(),
    toast: vi.fn(),
    menuSheet: vi.fn(),
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
  return { useStore, DEF: {} }
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
  swapActiveWorkoutExercise: vi.fn(), menuSheet: mocks.menuSheet, barWeightSheet: vi.fn(), plateCalculatorSheet: vi.fn(),
  exerciseNoteSheet: vi.fn(), sessionNoteSheet: vi.fn(), effortPickerSheet: vi.fn(), exerciseHistorySheet: vi.fn(),
  shareRoutineSheet: vi.fn(),
}))
vi.mock('../components/Media.jsx', () => ({ default: () => null }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(() => Promise.resolve({})),
  IS_APPLE: false, IS_ANDROID: false, BIO: 'biometrics',
}))

let dom, root, container

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event', 'Blob']) globalThis[key] = dom[key]
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

async function mount(stateOverrides = {}) {
  mocks.S = {
    unit: 'kg', restSec: 90, sound: false, effort: 'none', gifSize: 'full',
    workoutDensity: 'spacious', restChime: 'bell',
    workouts: [], exWeights: {}, routines: [], week: {}, dayPlan: {},
    active: null,
    ...stateOverrides,
  }
  installDom()
  await act(async () => { root.render(React.createElement(Workout)) })
}

async function unmount() {
  if (!root) return
  await act(async () => { root.unmount() })
  root = null; container = null; dom = null
}

beforeEach(() => { vi.clearAllMocks() })
afterEach(async () => { await unmount() })

describe('StartChooser rendering when no active workout', () => {
  it('renders clean StartChooser with empty routines', async () => {
    await mount()
    expect(container.querySelector('h1').textContent).toBe('Workout')
    expect(container.querySelector('.start-freestyle-card')).toBeTruthy()
  })

  it('renders with today scheduled routine', async () => {
    const today = new Date().getDay()
    await mount({
      routines: [{ id: 'r1', name: 'Leg Day', emoji: 'legs', ex: [{ id: '0025' }] }],
      week: { [today]: 'r1' }
    })
    expect(container.querySelector('.routine-card-featured')).toBeTruthy()
    expect(container.textContent).toContain('Leg Day')
  })

  it('renders with other routines', async () => {
    await mount({
      routines: [
        { id: 'r1', name: 'Push', emoji: 'dumbbell', ex: [{ id: '0025' }] },
        { id: 'r2', name: 'Pull', emoji: 'pullup', ex: [{ id: '0010' }] }
      ]
    })
    expect(container.textContent).toContain('My routines (2)')
  })

  it('handles dayPlan undefined or null gracefully', async () => {
    await mount({ dayPlan: undefined })
  })

  it('handles week undefined or null gracefully', async () => {
    await mount({ week: undefined })
  })

  it('handles routines undefined or null gracefully', async () => {
    await mount({ routines: undefined })
  })

  it('handles routine with ex undefined gracefully', async () => {
    const today = new Date().getDay()
    await mount({
      routines: [{ id: 'r1', name: 'Broken Routine' }],
      week: { [today]: 'r1' }
    })
  })
})
