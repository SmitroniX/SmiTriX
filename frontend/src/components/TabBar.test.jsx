// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import TabBar from './TabBar.jsx'
import { useStore, DEF } from '../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useStore.setState({
    user: { id: 'test_user', name: 'Test User' },
    S: { ...DEF, active: null },
    isGuest: () => false,
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('TabBar component', () => {
  it('does not render when user is not authenticated and not guest', async () => {
    useStore.setState({ user: null, isGuest: () => false })
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/home']}>
          <TabBar onStart={() => {}} />
        </MemoryRouter>
      )
    })
    expect(container.querySelector('#tabbar')).toBeNull()
  })

  it('highlights Home tab on /home, /settings, /checkin, and /admin', async () => {
    const routes = ['/home', '/settings', '/checkin', '/admin']
    for (const route of routes) {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[route]}>
            <TabBar onStart={() => {}} />
          </MemoryRouter>
        )
      })
      const buttons = container.querySelectorAll('#tabbar button')
      const homeBtn = buttons[0] // first tab is Home
      expect(homeBtn.classList.contains('on'), `Home tab should be on for ${route}`).toBe(true)
    }
  })

  it('highlights Stats tab on /stats and /history', async () => {
    const routes = ['/stats', '/history']
    for (const route of routes) {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[route]}>
            <TabBar onStart={() => {}} />
          </MemoryRouter>
        )
      })
      const buttons = container.querySelectorAll('#tabbar button')
      const statsBtn = buttons[3] // 4th button (Home, Plan, Start, Stats, Library)
      expect(statsBtn.classList.contains('on'), `Stats tab should be on for ${route}`).toBe(true)
    }
  })

  it('highlights Library tab on /library and /muscles', async () => {
    const routes = ['/library', '/muscles']
    for (const route of routes) {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[route]}>
            <TabBar onStart={() => {}} />
          </MemoryRouter>
        )
      })
      const buttons = container.querySelectorAll('#tabbar button')
      const libBtn = buttons[4] // 5th button
      expect(libBtn.classList.contains('on'), `Library tab should be on for ${route}`).toBe(true)
    }
  })

  it('highlights Plan tab on /plan', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/plan']}>
          <TabBar onStart={() => {}} />
        </MemoryRouter>
      )
    })
    const buttons = container.querySelectorAll('#tabbar button')
    const planBtn = buttons[1] // 2nd button
    expect(planBtn.classList.contains('on')).toBe(true)
  })

  it('highlights Start button on /workout', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/workout']}>
          <TabBar onStart={() => {}} />
        </MemoryRouter>
      )
    })
    const buttons = container.querySelectorAll('#tabbar button')
    const startBtn = buttons[2] // 3rd button
    expect(startBtn.classList.contains('on')).toBe(true)
  })
})
