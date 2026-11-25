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

describe('TabBar component (GymMane 5-slot floating glass pill)', () => {
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

  it('highlights Home tab on /home, /plan, /tools, /journal, /nutrition, /recovery', async () => {
    const routes = ['/home', '/plan', '/tools', '/journal', '/nutrition', '/recovery']
    for (const route of routes) {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[route]}>
            <TabBar onStart={() => {}} />
          </MemoryRouter>
        )
      })
      const buttons = container.querySelectorAll('#tabbar button')
      expect(buttons.length).toBe(5)
      const homeBtn = buttons[0]
      expect(homeBtn.classList.contains('on'), `Home tab should be on for ${route}`).toBe(true)
    }
  })

  it('highlights Progress tab on /stats, /history, /measures, and /timeline', async () => {
    const routes = ['/stats', '/history', '/measures', '/timeline']
    for (const route of routes) {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[route]}>
            <TabBar onStart={() => {}} />
          </MemoryRouter>
        )
      })
      const buttons = container.querySelectorAll('#tabbar button')
      const progressBtn = buttons[1]
      expect(progressBtn.classList.contains('on'), `Progress tab should be on for ${route}`).toBe(true)
    }
  })

  it('highlights center Play FAB on /workout', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/workout']}>
          <TabBar onStart={() => {}} />
        </MemoryRouter>
      )
    })
    const buttons = container.querySelectorAll('#tabbar button')
    const startBtn = buttons[2]
    expect(startBtn.classList.contains('on')).toBe(true)
  })

  it('highlights Exercises tab on /library and /muscles', async () => {
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
      const libBtn = buttons[3]
      expect(libBtn.classList.contains('on'), `Library tab should be on for ${route}`).toBe(true)
    }
  })

  it('highlights Profile tab on /profile, /settings, /checkin, /admin, /plans, /awards', async () => {
    const routes = ['/profile', '/settings', '/checkin', '/admin', '/plans', '/awards']
    for (const route of routes) {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[route]}>
            <TabBar onStart={() => {}} />
          </MemoryRouter>
        )
      })
      const buttons = container.querySelectorAll('#tabbar button')
      const profileBtn = buttons[4]
      expect(profileBtn.classList.contains('on'), `Profile tab should be on for ${route}`).toBe(true)
    }
  })
})
