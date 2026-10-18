// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({
    S: state.S,
    user: null,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
    replaceState: vi.fn(), setUser: vi.fn(), pullState: vi.fn(), pushState: vi.fn(),
    signOut: vi.fn(), signOutAll: vi.fn(), resetDemo: vi.fn(), disconnectServer: vi.fn(),
  })
  return state
})

const soundMocks = vi.hoisted(() => ({
  playRestChime: vi.fn(),
  beep: vi.fn(),
  vibrate: vi.fn(),
}))

const uiMocks = vi.hoisted(() => ({
  toast: vi.fn(),
  openSheet: vi.fn(),
}))

vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore, DEF: { reminder: { time: '17:30' } }, hasData: () => false }
})

vi.mock('../store/useUI.js', () => {
  const snap = () => uiMocks
  const useUI = selector => selector ? selector(snap()) : snap()
  useUI.getState = snap
  return { useUI }
})

vi.mock('../lib/sound.js', () => soundMocks)
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(), webauthnOK: () => false, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(), IS_ANDROID: false,
}))
vi.mock('../lib/push.js', () => ({ pushSupported: () => false, enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn() }))
vi.mock('../lib/wakelock.js', () => ({ wakeLockSupported: () => false }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false, isAndroid: () => Promise.resolve(false), shareExport: vi.fn(), syncReminder: vi.fn() }))
vi.mock('./MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))
vi.mock('../sheets.jsx', () => ({
  loadStarterPlan: vi.fn(), starterPlanSheet: vi.fn(), confirmSheet: vi.fn(), importFromApp: vi.fn(),
  importFromHevy: vi.fn(), importHubSheet: vi.fn(), equipmentProfileSheet: vi.fn(), workoutControlsSheet: vi.fn(),
}))

import { bindUI } from '../components/ui.jsx'
import { useUI } from '../store/useUI.js'

globalThis.__APP_VERSION__ ??= 'test'

let host, root
beforeEach(() => {
  vi.clearAllMocks()
  bindUI(useUI)
  mocks.S = {
    unit: 'kg', restSec: 90, restPauseSec: 15, sound: false, effort: 'none',
    gifSize: 'full', workouts: [], routines: [], exWeights: {},
    workoutDensity: 'spacious', restChime: 'bell',
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mount = () => act(() => root.render(<Settings />))
const segButton = label => [...host.querySelectorAll('.seg button')].find(b => b.textContent === label)

describe('Settings — workout density and rest timer chime', () => {
  it('toggles workout density between spacious and compact', () => {
    mount()
    const spaciousBtn = segButton('Spacious')
    const compactBtn = segButton('Compact')

    expect(spaciousBtn).toBeTruthy()
    expect(compactBtn).toBeTruthy()
    expect(spaciousBtn.getAttribute('aria-pressed')).toBe('true')

    act(() => { compactBtn.click() })
    expect(mocks.S.workoutDensity).toBe('compact')

    mount()
    expect(segButton('Compact').getAttribute('aria-pressed')).toBe('true')

    act(() => { segButton('Spacious').click() })
    expect(mocks.S.workoutDensity).toBe('spacious')
  })

  it('displays selected rest chime and opens picker sheet on click', () => {
    mount()
    const row = [...host.querySelectorAll('.lrow')].find(r => r.textContent.includes('Rest timer chime'))
    expect(row).toBeTruthy()
    expect(row.textContent).toContain('Bell chime')

    act(() => { row.click() })
    expect(uiMocks.openSheet).toHaveBeenCalled()

    // Test sheet selection callback
    const sheetRenderer = uiMocks.openSheet.mock.calls[0][0]
    const close = vi.fn()
    const element = sheetRenderer(close)

    expect(element.props.title).toBe('Rest timer chime')
    expect(element.props.value).toBe('bell')

    act(() => {
      element.props.onChange('gong')
    })

    expect(mocks.S.restChime).toBe('gong')
    expect(soundMocks.playRestChime).toHaveBeenCalledWith('gong', true)
  })

  it('triggers chime test when clicking Test chime button', () => {
    mocks.S.restChime = 'digital'
    mount()

    const testBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Test chime'))
    expect(testBtn).toBeTruthy()

    act(() => { testBtn.click() })
    expect(soundMocks.playRestChime).toHaveBeenCalledWith('digital', true)
  })
})
