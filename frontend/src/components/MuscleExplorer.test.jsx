// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MuscleExplorer from './MuscleExplorer.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({ S: state.S, user: null, update: mut => { const next = structuredClone(state.S); mut(next); state.S = next } })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore }
})

const mounted = []
function render(props = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(<MuscleExplorer {...props} />))
  return host
}

beforeEach(() => {
  mocks.S = {
    unit: 'kg', lang: 'en', body: 'male', routines: [], workouts: [], customEx: [],
    exWeights: {}, equipProfiles: [], activeEquipId: null, equipFilterOn: false, favEx: []
  }
  document.body.innerHTML = ''
})
afterEach(() => { act(() => { mounted.splice(0).forEach(root => root.unmount()) }) })

describe('MuscleExplorer', () => {
  it('renders muscle chips and shows guidance when no muscle is selected in picker mode', () => {
    const host = render({ onPick: vi.fn() })
    expect(host.textContent).toContain('Choose a muscle to see exercises that train it.')
  })

  it('filters exercises when a muscle chip is clicked and supports machine quick filtering', () => {
    const onPick = vi.fn()
    const host = render({ onPick })
    const chestChip = [...host.querySelectorAll('.chips button')].find(b => b.textContent.toLowerCase().includes('chest'))
    expect(chestChip).toBeTruthy()
    act(() => chestChip.click())

    expect(host.textContent).toContain('Exercises for Chest')
    const machinePreset = [...host.querySelectorAll('.chips button')].find(b => b.textContent.includes('Machine'))
    expect(machinePreset).toBeTruthy()
    act(() => machinePreset.click())

    // All exercises shown should be machines
    const items = host.querySelectorAll('.list .item')
    expect(items.length).toBeGreaterThan(0)
    items.forEach(item => {
      expect(item.textContent.toLowerCase()).toMatch(/machine|assisted/)
    })
  })

  it('supports searching with one-tap clear button', () => {
    const host = render({ onPick: vi.fn() })
    const chestChip = [...host.querySelectorAll('.chips button')].find(b => b.textContent.toLowerCase().includes('chest'))
    act(() => chestChip.click())

    const input = host.querySelector('.search input')
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    act(() => {
      nativeSetter.call(input, 'press')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const clearBtn = host.querySelector('.search .iconbtn')
    expect(clearBtn).toBeTruthy()
    act(() => clearBtn.click())
    expect(input.value).toBe('')
  })
})
