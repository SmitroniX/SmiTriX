// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import RecoveryMap from './RecoveryMap.jsx'
import { EXIDX } from '../lib/exercises.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeAll(() => import('../lib/body-paths.js'))

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('RecoveryMap component', () => {
  it('renders recovery map, readiness score, and status categories for empty workouts', async () => {
    await act(async () => {
      root.render(<RecoveryMap workouts={[]} body="male" />)
    })
    expect(container.querySelector('.recovery-map-card')).toBeTruthy()
    expect(container.textContent).toContain('Readiness Index')
    expect(container.textContent).toContain('100%')
    expect(container.textContent).toContain('optimal')
    expect(container.textContent).toContain('Ready')
    expect(container.textContent).toContain('Rebuilding')
    expect(container.textContent).toContain('Fatigued')
    expect(container.textContent).toContain('Recommended to train next:')
  })

  it('renders fatigued state and recovery hours after heavy training', async () => {
    const now = Date.now()
    const workouts = [
      {
        id: 'w1',
        start: now - 3600000, // 1 hour ago
        d: new Date(now - 3600000).toISOString(),
        entries: [
          {
            id: 'bench',
            exercise: { tg: 'chest', sm: 'triceps', bp: 'chest' },
            sets: [
              { done: true, w: 100, r: 10 },
              { done: true, w: 100, r: 10 },
              { done: true, w: 100, r: 10 },
            ],
          },
        ],
      },
    ]

    await act(async () => {
      root.render(<RecoveryMap workouts={workouts} body="male" unit="kg" />)
    })

    expect(container.textContent).toContain('Needs recovery:')
    expect(container.textContent).toContain('Chest')
  })

  it('selects and deselects a muscle when clicking training recommendation chips', async () => {
    await act(async () => {
      root.render(<RecoveryMap workouts={[]} body="male" />)
    })

    const recButton = container.querySelector('.mchips button')
    expect(recButton).toBeTruthy()

    // Click to select
    await act(async () => {
      recButton.click()
    })
    expect(container.textContent).toContain('Readiness: 100%')
    expect(container.textContent).toContain('Ready to train')
    expect(container.textContent).toContain('0 sets (30d)')

    // Click again to deselect
    await act(async () => {
      recButton.click()
    })
    expect(container.textContent).not.toContain('0 sets (30d)')
  })

  it('toggles regional breakdown visibility on button click', async () => {
    await act(async () => {
      root.render(<RecoveryMap workouts={[]} body="male" />)
    })

    const toggleBtn = [...container.querySelectorAll('button')].find(b =>
      b.textContent.includes('regional breakdown')
    )
    expect(toggleBtn).toBeTruthy()
    expect(toggleBtn.textContent).toContain('Show regional breakdown')

    // Click to show
    await act(async () => {
      toggleBtn.click()
    })
    expect(toggleBtn.textContent).toContain('Hide regional breakdown')
    expect(container.textContent).toContain('Chest')
    expect(container.textContent).toContain('Legs')
    expect(container.textContent).toContain('Back')

    // Click to hide
    await act(async () => {
      toggleBtn.click()
    })
    expect(toggleBtn.textContent).toContain('Show regional breakdown')
  })
})
