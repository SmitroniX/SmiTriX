// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PlansManager from './PlansManager.jsx'
import { useStore, DEF } from '../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('PlansManager View', () => {
  let container = null
  let root = null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    useStore.setState({
      S: { ...DEF, tier: 'legacy' },
      user: { id: 'u1', name: 'Athlete Test' },
      ready: true
    })
  })

  afterEach(() => {
    if (root) act(() => root.unmount())
    if (container && container.parentNode) container.parentNode.removeChild(container)
  })

  it('renders both Free Plan and Legacy Plan sections', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <PlansManager />
        </MemoryRouter>
      )
    })

    expect(container.textContent).toContain('Plans & Features')
    expect(container.textContent).toContain('Community Free Section')
    expect(container.textContent).toContain('Golden Era Legacy Section')
    expect(container.textContent).toContain('Free Plan')
    expect(container.textContent).toContain('Legacy Plan')
  })

  it('displays features, benefits, and limitations clearly', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <PlansManager />
        </MemoryRouter>
      )
    })

    expect(container.textContent).toContain('Benefits')
    expect(container.textContent).toContain('Limitations')
    expect(container.textContent).toContain('Features & Entitlements')
    expect(container.textContent).toContain('Active Plan')
  })

  it('allows filtering by tab', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <PlansManager />
        </MemoryRouter>
      )
    })

    const freeTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.trim() === 'Free Plan')
    expect(freeTab).toBeTruthy()

    act(() => {
      freeTab.click()
    })

    expect(container.textContent).toContain('Community Free Section')
    expect(container.textContent).not.toContain('Golden Era Legacy Section')
  })
})
