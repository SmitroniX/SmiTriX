// @vitest-environment happy-dom
/** @license AGPL-3.0-or-later */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ImportHubSheet from './ImportHubSheet.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('ImportHubSheet', () => {
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

  it('renders app guides and switches tabs', () => {
    act(() => root.render(<ImportHubSheet close={() => {}} onFile={() => {}} onHevyApi={() => {}} />))
    expect(host.textContent).toContain('Import Workout Data')
    expect(host.textContent).toContain('Hevy')
    expect(host.textContent).toContain('Strong')
    expect(host.textContent).toContain('FitNotes')

    const strongTab = [...host.querySelectorAll('button[role="tab"]')].find(b => b.textContent.includes('Strong'))
    expect(strongTab).toBeTruthy()
    act(() => strongTab.click())
    expect(host.textContent).toContain('Settings → Export Workouts')
  })

  it('calls onHevyApi when the Hevy API button is clicked', () => {
    const onHevyApi = vi.fn()
    act(() => root.render(<ImportHubSheet close={() => {}} onFile={() => {}} onHevyApi={onHevyApi} />))
    const btn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Import with Hevy API'))
    expect(btn).toBeTruthy()
    act(() => btn.click())
    expect(onHevyApi).toHaveBeenCalledTimes(1)
  })

  it('calls onFile when a file is selected via input', () => {
    const onFile = vi.fn()
    const close = vi.fn()
    act(() => root.render(<ImportHubSheet close={close} onFile={onFile} onHevyApi={() => {}} />))
    const input = host.querySelector('input[type="file"]')
    expect(input).toBeTruthy()

    const file = new File(['mock,data'], 'workouts.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })

    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onFile).toHaveBeenCalledWith(file)
    expect(close).toHaveBeenCalled()
  })
})
