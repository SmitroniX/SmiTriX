// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  FormCheckBadge,
  FormCheckPlayerModal,
  FormCheckRecordModal,
} from './FormCheckVaultModal.jsx'
import * as videoVault from '../lib/video-vault.js'

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

describe('FormCheckVaultModal components', () => {
  it('renders FormCheckBadge only when videoId is provided and handles click', async () => {
    const onClick = vi.fn()
    await act(async () => {
      root.render(<FormCheckBadge videoId={null} onClick={onClick} />)
    })
    expect(container.innerHTML).toBe('')

    await act(async () => {
      root.render(<FormCheckBadge videoId="v_123" onClick={onClick} />)
    })
    const badge = container.querySelector('.form-check-badge-tag')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toContain('Form Check')

    badge.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders FormCheckPlayerModal with video controls, speed options, and scrubber', async () => {
    const fakeBlob = new Blob(['video'], { type: 'video/mp4' })
    vi.spyOn(videoVault, 'getVideo').mockResolvedValue({
      id: 'v_456',
      blob: fakeBlob,
      exerciseName: 'Deadlift',
      isPR: true,
      durationSec: 25,
      trimStartSec: 0,
      trimEndSec: 25,
      createdAt: '2026-10-18T10:00:00Z',
    })
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    const close = vi.fn()
    await act(async () => {
      root.render(
        <FormCheckPlayerModal
          videoId="v_456"
          setInfo={{ exerciseName: 'Deadlift', isPR: true, weight: 180, reps: 5, unit: 'kg' }}
          close={close}
        />
      )
    })

    expect(container.textContent).toContain('Deadlift')
    expect(container.textContent).toContain('PR')
    expect(container.textContent).toContain('Playback Speed')
    expect(container.textContent).toContain('0.25×')
    expect(container.textContent).toContain('Trim Video Clip')
    expect(container.textContent).toContain('Export Video')
    expect(container.textContent).toContain('Privacy-First')
  })

  it('renders FormCheckRecordModal with camera and file upload options', async () => {
    const close = vi.fn()
    await act(async () => {
      root.render(
        <FormCheckRecordModal
          exerciseId="squat"
          exerciseName="Barbell Back Squat"
          setIndex={1}
          isPR={true}
          workoutId="w1"
          weight={120}
          reps={5}
          close={close}
        />
      )
    })

    expect(container.textContent).toContain('Record Form Check')
    expect(container.textContent).toContain('Open Camera & Record')
    expect(container.textContent).toContain('Choose Video File')
    expect(container.textContent).toContain('IndexedDB')
  })
})
