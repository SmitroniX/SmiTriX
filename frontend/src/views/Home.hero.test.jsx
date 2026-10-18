// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home.jsx'
import { useStore } from '../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mockStartFlow = vi.fn()
vi.mock('../sheets.jsx', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    startFlow: (...args) => mockStartFlow(...args),
  }
})

describe('Home Hero Workout Card & Sticky Header', () => {
  let host, root

  beforeEach(() => {
    vi.clearAllMocks()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const todayIso = new Date().toISOString().slice(0, 10)
    useStore.getState().update(s => {
      s.active = null
      s.dayPlan = { [todayIso]: 'routine-alpha' }
      s.routines = [
        {
          id: 'routine-alpha',
          name: 'Hypertrophy Chest & Back',
          ex: ['0025', '0040'],
          entries: [
            { id: '0025', sets: [{ w: 80, r: 8 }, { w: 80, r: 8 }, { w: 80, r: 8 }] },
            { id: '0040', sets: [{ w: 60, r: 10 }, { w: 60, r: 10 }] },
          ],
        },
      ]
      s.workouts = []
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    useStore.getState().update(s => {
      s.active = null
      s.routines = []
      s.workouts = []
    })
  })

  it('renders sticky frosted glass header on home screen', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      )
    })

    const stickyHeader = host.querySelector('.home-sticky-header')
    expect(stickyHeader).toBeTruthy()
  })

  it('renders redesigned hero workout card with title, duration, muscle chips, and start CTA', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      )
    })

    const heroCard = host.querySelector('.home-hero-workout-card')
    expect(heroCard).toBeTruthy()
    expect(heroCard.textContent).toContain('Hypertrophy Chest & Back')
    expect(heroCard.textContent).toMatch(/~\d+\s*min/)
    expect(heroCard.textContent).toContain('2 exercises')
    expect(heroCard.textContent).toContain('6 sets')

    // Muscle chips
    const muscleChips = heroCard.querySelectorAll('.hero-muscle-chip')
    expect(muscleChips.length).toBeGreaterThan(0)

    // Start workout CTA button
    const startBtn = heroCard.querySelector('.hero-start-cta')
    expect(startBtn).toBeTruthy()
    expect(startBtn.textContent).toContain('Start Workout')

    act(() => {
      startBtn.click()
    })
    expect(mockStartFlow).toHaveBeenCalledWith('routine-alpha')
  })

  it('handles empty routines gracefully without crashing', () => {
    useStore.getState().update(s => {
      s.routines = []
    })

    act(() => {
      root.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      )
    })

    expect(host.querySelector('.home-sticky-header')).toBeTruthy()
    expect(host.querySelector('.home-hero-workout-card')).toBeNull()
  })
})
