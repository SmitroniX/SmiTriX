// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings, { ApiKeyManagerSheet } from './Settings.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.__APP_VERSION__ ??= 'test'

const state = vi.hoisted(() => {
  return {
    S: {},
    coachLocal: { mode: 'byok', provider: 'anthropic', model: 'claude-opus-5', baseUrl: null },
    keys: {
      'coach.apiKey.anthropic': 'sk-ant-test',
      'coach.apiKey.compatible': null,
      'hevy.apiKey': 'hevy-pro-key',
    },
    ui: {
      toast: vi.fn(),
      openSheet: vi.fn(),
    },
  }
})

vi.mock('../store/useStore.js', () => {
  const snapshot = () => ({
    S: state.S,
    user: null,
    coachLocal: state.coachLocal,
    setCoachLocal: vi.fn(async patch => {
      Object.assign(state.coachLocal, patch)
    }),
    update: vi.fn(),
    replaceState: vi.fn(),
    setUser: vi.fn(),
    pullState: vi.fn(),
    pushState: vi.fn(),
    signOut: vi.fn(),
    signOutAll: vi.fn(),
    resetDemo: vi.fn(),
    disconnectServer: vi.fn(),
  })
  const useStore = selector => (selector ? selector(snapshot()) : snapshot())
  useStore.getState = snapshot
  return { useStore, DEF: { reminder: { time: '17:30' } }, hasData: () => false }
})

vi.mock('../store/useUI.js', () => {
  const snap = () => ({
    toast: state.ui.toast,
    openSheet: state.ui.openSheet,
  })
  const useUI = selector => (selector ? selector(snap()) : snap())
  useUI.getState = snap
  return { useUI }
})

vi.mock('../lib/coach-secrets.js', () => ({
  getApiKey: vi.fn(async (provider = null) => {
    return state.keys[provider ? `coach.apiKey.${provider}` : 'coach.apiKey'] || null
  }),
  setApiKey: vi.fn(async (val, provider = null) => {
    state.keys[provider ? `coach.apiKey.${provider}` : 'coach.apiKey'] = val
  }),
  clearApiKey: vi.fn(async (provider = null) => {
    delete state.keys[provider ? `coach.apiKey.${provider}` : 'coach.apiKey']
  }),
  hasApiKey: vi.fn(async (provider = null) => {
    return !!state.keys[provider ? `coach.apiKey.${provider}` : 'coach.apiKey']
  }),
  getHevyApiKey: vi.fn(async () => state.keys['hevy.apiKey'] || null),
  setHevyApiKey: vi.fn(async val => { state.keys['hevy.apiKey'] = val }),
  clearHevyApiKey: vi.fn(async () => { delete state.keys['hevy.apiKey'] }),
}))

vi.mock('../lib/import-hevy.js', () => ({
  testHevyApiKey: vi.fn(async k => (k === 'valid-hevy' ? { ok: true } : { ok: false, error: 'auth' })),
}))

vi.mock('../lib/coach-local.js', () => ({
  localModels: vi.fn(async () => ({ ok: true, models: ['model-1', 'model-2'] })),
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(),
  webauthnOK: () => false,
  passkeyLogin: vi.fn(),
  passkeyRegister: vi.fn(),
  IS_ANDROID: false,
}))
vi.mock('../lib/push.js', () => ({
  pushSupported: () => false,
  enablePush: vi.fn(),
  disablePush: vi.fn(),
  sendTestPush: vi.fn(),
}))
vi.mock('../lib/wakelock.js', () => ({ wakeLockSupported: () => false }))
vi.mock('../lib/mobile.js', () => ({
  MOBILE: false,
  isAndroid: () => Promise.resolve(false),
  shareExport: vi.fn(),
  syncReminder: vi.fn(),
}))
vi.mock('./MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))
vi.mock('../sheets.jsx', () => ({
  loadStarterPlan: vi.fn(),
  starterPlanSheet: vi.fn(),
  confirmSheet: vi.fn(),
  importFromApp: vi.fn(),
  importFromHevy: vi.fn(),
  importHubSheet: vi.fn(),
  equipmentProfileSheet: vi.fn(),
  menuSheet: vi.fn(),
}))
vi.mock('../components/TutorialDialog.jsx', () => ({ openTutorial: vi.fn() }))
vi.mock('../components/UpdateDialog.jsx', () => ({ startAppUpdate: vi.fn() }))
vi.mock('../lib/update.js', () => ({ checkForUpdate: vi.fn(), downloadAndInstall: vi.fn() }))

let host, root

beforeEach(() => {
  state.S = {
    unit: 'kg', restSec: 90, restPauseSec: 15, sound: false, effort: 'none',
    gifSize: 'full', workouts: [], routines: [], exWeights: {},
  }
  state.coachLocal = { mode: 'byok', provider: 'anthropic', model: 'claude-opus-5', baseUrl: null }
  state.keys = {
    'coach.apiKey.anthropic': 'sk-ant-test',
    'coach.apiKey.compatible': null,
    'hevy.apiKey': 'hevy-pro-key',
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mount = async component => {
  await act(async () => {
    root.render(component)
  })
  await act(async () => {
    await new Promise(r => setTimeout(r, 30))
  })
}

describe('Settings — AI Coach & API Keys section', () => {
  it('renders AI Coach and Manage API Keys rows with active status', async () => {
    await mount(<Settings />)

    const text = host.textContent
    expect(text).toContain('AI Coach & API Keys')
    expect(text).toContain('Active · Anthropic API (claude-opus-5)')
    expect(text).toContain('Manage API Keys')
  })

  it('shows missing key status when active BYOK provider has no key saved', async () => {
    state.keys['coach.apiKey.anthropic'] = null
    await mount(<Settings />)

    const text = host.textContent
    expect(text).toContain('Needs API key · Anthropic API')
  })

  it('shows active status for OpenAI-compatible even without key', async () => {
    state.coachLocal = { mode: 'byok', provider: 'compatible', model: 'llama3:latest', baseUrl: 'http://localhost:11434' }
    await mount(<Settings />)

    const text = host.textContent
    expect(text).toContain('Active · OpenAI-compatible endpoint (llama3:latest)')
  })

  it('opens ApiKeyManagerSheet when Manage API Keys row is clicked', async () => {
    await mount(<Settings />)

    const manageKeysRow = [...host.querySelectorAll('button.lrow')].find(el => el.textContent.includes('Manage API Keys'))
    expect(manageKeysRow).toBeTruthy()
    await act(async () => {
      manageKeysRow.click()
      await new Promise(r => setTimeout(r, 30))
    })
    expect(state.ui.openSheet).toHaveBeenCalled()
  })
})

describe('ApiKeyManagerSheet', () => {
  it('switches between AI Coach and Hevy Pro tabs', async () => {
    await mount(<ApiKeyManagerSheet close={vi.fn()} onUpdate={vi.fn()} />)

    // Initially in coach tab
    expect(host.textContent).toContain('Anthropic API')

    // Find and click Hevy tab button
    const hevyBtn = [...host.querySelectorAll('.seg button')].find(b => b.textContent.includes('Hevy Pro'))
    expect(hevyBtn).toBeTruthy()
    await act(async () => {
      hevyBtn.click()
      await new Promise(r => setTimeout(r, 30))
    })

    expect(host.textContent).toContain('Hevy Pro API key')
    expect(host.textContent).toContain('Get your key on hevy.com')
  })

  it('allows switching providers in AI Coach tab and shows endpoint input for compatible', async () => {
    await mount(<ApiKeyManagerSheet close={vi.fn()} onUpdate={vi.fn()} />)

    // Compatible chip
    const compatChip = [...host.querySelectorAll('button.chip')].find(b => b.textContent.includes('compatible'))
    expect(compatChip).toBeTruthy()
    await act(async () => {
      compatChip.click()
      await new Promise(r => setTimeout(r, 30))
    })

    // Endpoint URL input should be visible for compatible
    expect(host.textContent).toContain('Endpoint URL')
    expect(host.textContent).toContain('Optional for local models')
  })

  it('enables connection test button for compatible even without key', async () => {
    await mount(<ApiKeyManagerSheet close={vi.fn()} onUpdate={vi.fn()} />)

    const compatChip = [...host.querySelectorAll('button.chip')].find(b => b.textContent.includes('compatible'))
    await act(async () => {
      compatChip.click()
      await new Promise(r => setTimeout(r, 30))
    })

    const testBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Test connection'))
    expect(testBtn).toBeTruthy()
    expect(testBtn.disabled).toBe(false)
  })

  it('disables connection test button for Anthropic when no key is entered or saved', async () => {
    state.keys['coach.apiKey.anthropic'] = null
    await mount(<ApiKeyManagerSheet close={vi.fn()} onUpdate={vi.fn()} />)

    const testBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Test connection'))
    expect(testBtn).toBeTruthy()
    expect(testBtn.disabled).toBe(true)
  })

  it('removes saved key when Remove key button is clicked', async () => {
    const onUpdate = vi.fn()
    await mount(<ApiKeyManagerSheet close={vi.fn()} onUpdate={onUpdate} />)

    const removeBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Remove key'))
    expect(removeBtn).toBeTruthy()
    await act(async () => {
      removeBtn.click()
      await new Promise(r => setTimeout(r, 30))
    })

    expect(state.keys['coach.apiKey.anthropic']).toBeUndefined()
    expect(state.ui.toast).toHaveBeenCalledWith('AI Coach key removed (Anthropic API)')
    expect(onUpdate).toHaveBeenCalled()
  })

  it('tests Hevy connection and renders success message', async () => {
    state.keys['hevy.apiKey'] = 'valid-hevy'
    await mount(<ApiKeyManagerSheet close={vi.fn()} onUpdate={vi.fn()} />)

    const hevyTab = [...host.querySelectorAll('.seg button')].find(b => b.textContent.includes('Hevy Pro'))
    await act(async () => {
      hevyTab.click()
      await new Promise(r => setTimeout(r, 30))
    })

    const testBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Test connection'))
    expect(testBtn).toBeTruthy()
    await act(async () => {
      testBtn.click()
      await new Promise(r => setTimeout(r, 30))
    })

    expect(host.textContent).toContain('Connected to Hevy API successfully!')
  })
})
