// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ActivityHeatmap from './ActivityHeatmap.jsx'

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

describe('ActivityHeatmap component', () => {
  it('renders SVG grid when workouts is empty', async () => {
    await act(async () => {
      root.render(<ActivityHeatmap workouts={[]} weekStart={1} />)
    })
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.textContent).toContain('0 workouts in last 16 weeks')
  })

  it('renders workouts when workouts are present', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const workouts = [
      { d: today, entries: [] },
      { d: '2026-08-01', entries: [] },
    ]
    await act(async () => {
      root.render(<ActivityHeatmap workouts={workouts} weekStart={1} />)
    })
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0)
  })
})
