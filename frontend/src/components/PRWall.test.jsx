// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import PRWall from './PRWall.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PRWall component', () => {
  it('renders message when no PRs are recorded', async () => {
    await act(async () => {
      root.render(<PRWall exWeights={{}} bw={75} unit="kg" />)
    })
    expect(container.textContent).toContain('No personal records logged yet')
  })

  it('renders PR items and calculates standards when bodyweight is provided', async () => {
    const exWeights = {
      'bench_press': { w: 100, d: '2026-09-01' },
      'barbell_squat': { w: 140, d: '2026-09-05' },
    }
    await act(async () => {
      root.render(<PRWall exWeights={exWeights} bw={80} unit="kg" />)
    })
    expect(container.textContent).toContain('100')
    expect(container.textContent).toContain('140')
    expect(container.textContent).toContain('kg')
    expect(container.textContent).toContain('Standards calculated')
  })
})
