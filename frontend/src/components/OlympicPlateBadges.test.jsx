// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import OlympicPlateBadges from './OlympicPlateBadges.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host, root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('OlympicPlateBadges', () => {
  it('renders standard kg Olympic color discs from total and bar weight', () => {
    act(() => {
      // 100 kg total with 20 kg bar = 40 kg per side -> 25 kg (red) + 15 kg (yellow)
      root.render(<OlympicPlateBadges totalWeight={100} barWeight={20} unit="kg" />)
    })

    const discs = host.querySelectorAll('.plate-disc-badge')
    expect(discs.length).toBe(2)
    expect(discs[0].textContent).toBe('25')
    expect(discs[0].style.backgroundColor).toBe('#e53935')
    expect(discs[1].textContent).toBe('15')
    expect(discs[1].style.backgroundColor).toBe('#fbc02d')
  })

  it('renders standard lb Olympic color discs', () => {
    act(() => {
      // 135 lb total with 45 lb bar = 45 lb per side -> 45 lb (blue)
      root.render(<OlympicPlateBadges totalWeight={135} barWeight={45} unit="lb" />)
    })

    const discs = host.querySelectorAll('.plate-disc-badge')
    expect(discs.length).toBe(1)
    expect(discs[0].textContent).toBe('45')
    expect(discs[0].style.backgroundColor).toBe('#1e88e5')
  })

  it('renders nothing when total weight is less than or equal to bar weight', () => {
    act(() => {
      root.render(<OlympicPlateBadges totalWeight={20} barWeight={20} unit="kg" />)
    })
    expect(host.querySelector('.inline-plate-discs')).toBeNull()

    act(() => {
      root.render(<OlympicPlateBadges totalWeight={15} barWeight={20} unit="kg" />)
    })
    expect(host.querySelector('.inline-plate-discs')).toBeNull()
  })

  it('renders passed plates array directly with size and dark contrast on light plates', () => {
    const customPlates = [
      { weight: 5, color: '#eceff1', label: '5', count: 2 },
    ]
    act(() => {
      root.render(<OlympicPlateBadges plates={customPlates} unit="kg" size="md" className="custom-test" />)
    })

    const container = host.querySelector('.inline-plate-discs')
    expect(container).toBeTruthy()
    expect(container.classList.contains('plate-md')).toBe(true)
    expect(container.classList.contains('custom-test')).toBe(true)

    const discs = host.querySelectorAll('.plate-disc-badge')
    expect(discs.length).toBe(2)
    expect(discs[0].textContent).toBe('5')
    expect(discs[0].style.color).toBe('#111')
  })

  it('renders unit suffix when showUnit is true', () => {
    act(() => {
      root.render(<OlympicPlateBadges totalWeight={60} barWeight={20} unit="kg" showUnit={true} />)
    })

    const discs = host.querySelectorAll('.plate-disc-badge')
    expect(discs.length).toBe(1)
    expect(discs[0].textContent).toBe('20kg')
  })
})
