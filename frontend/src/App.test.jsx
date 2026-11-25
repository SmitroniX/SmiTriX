// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { useStore, DEF } from './store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
  text: async () => '',
})

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useStore.setState({
    boot: vi.fn(),
    user: { id: 'test_user', name: 'Test User' },
    S: { ...DEF, active: null, heatTone: 'green' },
    ready: true,
    isGuest: () => false,
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('App shell and component placement', () => {
  it('renders TabBar and syncs heatTone dataset attribute on documentElement', async () => {
    await act(async () => {
      root.render(<App />)
    })

    expect(container.querySelector('#tabbar')).not.toBeNull()
    expect(document.documentElement.dataset.heatTone).toBe('green')
  })
})
