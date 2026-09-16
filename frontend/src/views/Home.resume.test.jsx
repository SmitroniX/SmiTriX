// @vitest-environment happy-dom
/** @license AGPL-3.0-or-later */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home.jsx'
import { useStore } from '../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('Home Active Workout Resume Banner', () => {
  let host, root

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    useStore.getState().update(s => {
      s.active = {
        name: 'Heavy Chest & Triceps',
        start: Date.now() - 60000,
        entries: [
          { id: 'bench', sets: [{ done: true }, { done: false }] },
        ],
      }
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    useStore.getState().update(s => { s.active = null })
  })

  it('renders prominent resume workout hero card when active workout exists', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      )
    })

    expect(host.textContent).toContain('In Progress')
    expect(host.textContent).toContain('Heavy Chest & Triceps')
    expect(host.textContent).toContain('Resume Workout')
    expect(host.querySelector('.active-workout-hero')).toBeTruthy()
    expect(host.querySelector('.live-workout-pulse')).toBeTruthy()
  })
})
