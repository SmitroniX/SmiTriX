// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Profile from './Profile.jsx'
import { useStore } from '../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('Profile view', () => {
  let host, root

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    useStore.getState().update(s => {
      s.workouts = [
        {
          id: 'w1',
          d: '2026-10-01',
          start: new Date('2026-10-01T10:00:00Z').getTime(),
          end: new Date('2026-10-01T11:00:00Z').getTime(),
          vol: 5000,
          entries: [
            {
              id: '0025',
              sets: [
                { w: 100, r: 10, done: true },
                { w: 100, r: 10, done: true },
              ],
            },
          ],
        },
        {
          id: 'w2',
          d: '2026-10-03',
          start: new Date('2026-10-03T10:00:00Z').getTime(),
          end: new Date('2026-10-03T10:45:00Z').getTime(),
          vol: 4000,
          entries: [
            {
              id: '0040',
              sets: [
                { w: 80, r: 8, done: true },
              ],
            },
          ],
        },
      ]
      s.bodyweight = [{ d: '2026-10-01', w: 75.5, t: 1000 }]
    })
    useStore.setState(state => ({
      ...state,
      user: { name: 'Alex Runner', email: 'alex@example.com' },
    }))
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    useStore.setState(state => ({
      ...state,
      user: null,
    }))
    useStore.getState().update(s => {
      s.workouts = []
      s.bodyweight = []
    })
  })

  it('renders profile avatar initials and athlete name', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    const avatar = host.querySelector('.profile-avatar')
    expect(avatar).toBeTruthy()
    expect(avatar.textContent).toBe('AR')

    const name = host.querySelector('.profile-name')
    expect(name).toBeTruthy()
    expect(name.textContent).toBe('Alex Runner')
  })

  it('renders key stats row with workout counts and streak', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    const statRow = host.querySelector('.profile-stats-row')
    expect(statRow).toBeTruthy()
    expect(statRow.textContent).toContain('2')
    expect(statRow.textContent).toContain('Workouts')
    expect(statRow.textContent).toContain('Days trained')
  })

  it('renders lifetime stats card with total sets and volume lifted', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    const tiles = host.querySelectorAll('.card .tile')
    expect(tiles.length).toBeGreaterThanOrEqual(4)
    // 3 done sets total in seed data
    expect(host.textContent).toContain('Total sets')
    expect(host.textContent).toContain('Volume lifted')
    expect(host.textContent).toContain('Time training')
  })

  it('renders body weight and activity heatmap cards', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    expect(host.textContent).toContain('Body weight')
    expect(host.textContent).toContain('75.5')
    expect(host.textContent).toContain('Activity')
    expect(host.querySelector('.activity-heatmap')).toBeTruthy()
  })

  it('handles empty workouts and guest user gracefully', () => {
    useStore.setState(state => ({ ...state, user: null }))
    useStore.getState().update(s => {
      s.workouts = []
      s.bodyweight = []
    })

    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    expect(host.querySelector('.profile-name').textContent).toBe('Athlete')
    expect(host.querySelector('.profile-avatar').textContent).toBe('🏋️')
    expect(host.textContent).toContain('No entries yet')
  })

  it('determines earliest date for memberSince even with unchronological workouts', () => {
    useStore.getState().update(s => {
      s.workouts = [
        { id: 'w1', d: '2026-10-01', entries: [] },
        { id: 'w2', d: '2024-05-15', entries: [] },
      ]
    })

    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    expect(host.querySelector('.profile-since').textContent).toContain('2024-05-15')
  })

  it('calculates bestWeek accurately across DST boundaries', () => {
    // 7 consecutive days across March 2026 DST shift
    useStore.getState().update(s => {
      s.workouts = [
        { id: 'w1', d: '2026-03-05', entries: [] },
        { id: 'w2', d: '2026-03-06', entries: [] },
        { id: 'w3', d: '2026-03-07', entries: [] },
        { id: 'w4', d: '2026-03-08', entries: [] },
        { id: 'w5', d: '2026-03-09', entries: [] },
        { id: 'w6', d: '2026-03-10', entries: [] },
        { id: 'w7', d: '2026-03-11', entries: [] },
      ]
    })

    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    expect(host.textContent).toContain('Best week')
    expect(host.textContent).toContain('7')
  })

  it('handles whitespace user name without rendering empty avatar', () => {
    useStore.setState(state => ({
      ...state,
      user: { name: '   ', email: 'space@example.com' },
    }))

    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    expect(host.querySelector('.profile-avatar').textContent).toBe('🏋️')
  })

  it('formats volume lifted properly when under 1000', () => {
    useStore.getState().update(s => {
      s.workouts = [
        {
          id: 'w1',
          d: '2026-10-01',
          entries: [
            { id: '0025', sets: [{ w: 50, r: 10, done: true }] },
          ],
        },
      ]
    })

    act(() => {
      root.render(
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      )
    })

    expect(host.textContent).toContain('500 kg')
  })
})
