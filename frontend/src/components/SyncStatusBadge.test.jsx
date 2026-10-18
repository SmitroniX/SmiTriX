// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SyncStatusBadge, SyncDetailsSheet } from './SyncStatusBadge.jsx'
import * as syncQueue from '../lib/sync-queue.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  syncQueue._resetSyncQueueForTesting({ online: true, syncing: false, pending: 0 })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('SyncStatusBadge component', () => {
  it('renders offline badge when offline', async () => {
    syncQueue._setSyncStatusForTesting({
      online: false,
      syncing: false,
      pending: 0,
    })

    await act(async () => {
      root.render(<SyncStatusBadge />)
    })

    const badge = container.querySelector('.sync-status-badge.offline')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toContain('Offline')
  })

  it('renders syncing badge when syncing', async () => {
    syncQueue._setSyncStatusForTesting({
      online: true,
      syncing: true,
      pending: 1,
    })

    await act(async () => {
      root.render(<SyncStatusBadge />)
    })

    const badge = container.querySelector('.sync-status-badge.syncing')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toContain('Syncing…')
  })

  it('renders pending sync badge when online with queued tasks', async () => {
    syncQueue._setSyncStatusForTesting({
      online: true,
      syncing: false,
      pending: 3,
    })

    await act(async () => {
      root.render(<SyncStatusBadge />)
    })

    const badge = container.querySelector('.sync-status-badge.pending')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toContain('Sync (3)')
  })

  it('renders SyncDetailsSheet and allows manual sync', async () => {
    const flushSpy = vi.spyOn(syncQueue, 'flushSyncQueue').mockResolvedValue({ flushed: 1, errors: 0 })
    const close = vi.fn()

    await act(async () => {
      root.render(<SyncDetailsSheet close={close} />)
    })

    expect(container.textContent).toContain('Offline & Cloud Sync')
    const syncBtn = container.querySelector('.btn.primary')
    expect(syncBtn).toBeTruthy()

    await act(async () => {
      syncBtn.click()
    })
    expect(flushSpy).toHaveBeenCalled()

    const closeBtn = container.querySelector('.iconbtn')
    closeBtn.click()
    expect(close).toHaveBeenCalled()
  })
})
