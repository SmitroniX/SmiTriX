// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlateCalculatorSheet from './PlateCalculatorSheet.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: { unit: 'kg', barWeights: {} } }
  state.snapshot = () => ({
    S: state.S,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector(mocks.snapshot())
  useStore.getState = mocks.snapshot
  return { useStore }
})

const EX = { id: '0025', n: 'barbell bench press', eq: 'barbell' }

let host, root
beforeEach(() => {
  mocks.S = { unit: 'kg', barWeights: {} }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('PlateCalculatorSheet', () => {
  it('renders target weight, visual plates, and changes weight with steppers', () => {
    act(() => {
      root.render(<PlateCalculatorSheet ex={EX} initialWeight={100} close={() => {}} />)
    })

    expect(host.querySelector('.val-num').textContent).toBe('100')
    // Per side = (100 - 20) / 2 = 40 kg -> 25 kg + 15 kg plates
    expect(host.querySelectorAll('.visual-plate').length).toBe(2)

    // Bump weight up
    const increaseBtn = host.querySelector('button[aria-label="Increase"]')
    act(() => {
      increaseBtn.click()
    })
    expect(host.querySelector('.val-num').textContent).toBe('102.5')
  })

  it('allows changing bar weight preset', () => {
    act(() => {
      root.render(<PlateCalculatorSheet ex={EX} initialWeight={80} close={() => {}} />)
    })

    const ezChip = Array.from(host.querySelectorAll('.chip')).find(c => c.textContent.includes('10 kg'))
    expect(ezChip).toBeTruthy()
    act(() => {
      ezChip.click()
    })
    expect(mocks.S.barWeights['0025']).toBe(10)
  })
})
