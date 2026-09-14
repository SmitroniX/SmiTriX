// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import RecoveryMap from './RecoveryMap.jsx'

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
  it('renders recovery map and status categories', async () => {
    await act(async () => {
      root.render(<RecoveryMap workouts={[]} body="male" />)
    })
    expect(container.querySelector('.recovery-map-card')).toBeTruthy()
    expect(container.textContent).toContain('Ready')
    expect(container.textContent).toContain('Rebuilding')
    expect(container.textContent).toContain('Fatigued')
  })
})
