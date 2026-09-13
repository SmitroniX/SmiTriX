// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MotionModal from './MotionModal.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const EX = {
  id: 'bench',
  n: 'barbell bench press',
  bp: 'chest',
  tg: 'pectorals',
  eq: 'barbell',
  gif: 'bench.gif',
  img: 'bench.jpg',
  st: [
    'Lie flat on your back on the bench.',
    'Grip the barbell slightly wider than shoulder width.',
    'Lower the bar slowly to your chest.',
    'Press upward powerfully to return to starting position.'
  ]
}

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

describe('MotionModal', () => {
  it('renders exercise name, player, steps, and tags', () => {
    const onClose = vi.fn()
    act(() => {
      root.render(<MotionModal ex={EX} onClose={onClose} />)
    })

    expect(host.querySelector('h3').textContent).toContain('barbell bench press')
    expect(host.querySelectorAll('.motion-step-item').length).toBe(4)
    expect(host.querySelector('.motion-player-media')).toBeTruthy()

    // Test close button
    act(() => {
      host.querySelector('.motion-modal-close').click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggles motion play and pause state', () => {
    act(() => {
      root.render(<MotionModal ex={EX} onClose={() => {}} />)
    })

    const playBtn = host.querySelector('.motion-player-playbtn')
    expect(playBtn).toBeTruthy()
    expect(playBtn.textContent).toContain('Pause')

    act(() => {
      playBtn.click()
    })
    expect(playBtn.textContent).toContain('Play')
  })

  it('toggles between loop and setup frame modes', () => {
    act(() => {
      root.render(<MotionModal ex={EX} onClose={() => {}} />)
    })

    const modeBtns = host.querySelectorAll('.motion-mode-btn')
    expect(modeBtns.length).toBe(2)

    // Setup mode button
    act(() => {
      modeBtns[1].click()
    })
    expect(host.querySelector('.motion-live-pill').textContent).toContain('Setup Frame')
    expect(host.querySelector('.motion-player-media').src).toContain('bench.jpg')

    // Back to loop mode
    act(() => {
      modeBtns[0].click()
    })
    expect(host.querySelector('.motion-live-pill').textContent).toContain('Motion HD')
    expect(host.querySelector('.motion-player-media').src).toContain('bench.gif')
  })

  it('allows clicking different steps to set them active', () => {
    act(() => {
      root.render(<MotionModal ex={EX} onClose={() => {}} />)
    })

    const steps = host.querySelectorAll('.motion-step-item')
    expect(steps[0].classList.contains('active')).toBe(true)
    expect(steps[1].classList.contains('active')).toBe(false)

    act(() => {
      steps[1].click()
    })
    expect(steps[1].classList.contains('active')).toBe(true)
  })
})
