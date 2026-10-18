// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HeartRateBadge, HeartRateSheet } from './HeartRateMonitor.jsx'
import { bleHeartRate } from '../lib/ble-heartrate.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  bleHeartRate.disconnect()
  bleHeartRate.setBpmManual(null)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('HeartRateMonitor components', () => {
  it('renders HeartRateBadge in disconnected state', async () => {
    await act(async () => {
      root.render(<HeartRateBadge />)
    })
    const btn = container.querySelector('.hr-live-badge')
    expect(btn).toBeTruthy()
    expect(btn.textContent).toContain('HR')
  })

  it('renders HeartRateBadge with live BPM and zone badge when connected', async () => {
    bleHeartRate.status = 'connected'
    bleHeartRate.setBpmManual(145)

    await act(async () => {
      root.render(<HeartRateBadge />)
    })
    expect(container.textContent).toContain('145')
    expect(container.textContent).toContain('Aerobic')
  })

  it('calls onClick callback when HeartRateBadge is clicked', async () => {
    const onClick = vi.fn()
    await act(async () => {
      root.render(<HeartRateBadge onClick={onClick} />)
    })

    const btn = container.querySelector('.hr-live-badge')
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders HeartRateSheet and handles pairing and close action', async () => {
    const connectSpy = vi.spyOn(bleHeartRate, 'connect').mockResolvedValue(true)
    const close = vi.fn()

    await act(async () => {
      root.render(<HeartRateSheet close={close} />)
    })
    expect(container.textContent).toContain('Heart Rate Monitor')
    expect(container.textContent).toContain('Heart Rate Zones')

    const pairBtn = container.querySelector('.btn.primary')
    expect(pairBtn).toBeTruthy()
    pairBtn.click()
    expect(connectSpy).toHaveBeenCalled()

    const closeBtn = container.querySelector('.iconbtn')
    expect(closeBtn).toBeTruthy()
    closeBtn.click()
    expect(close).toHaveBeenCalledTimes(1)
  })
})
