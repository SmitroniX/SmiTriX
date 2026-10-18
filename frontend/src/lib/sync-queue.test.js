// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  enqueuePushState,
  getQueue,
  clearQueue,
  flushSyncQueue,
  getSyncStatus,
  subscribeSyncStatus,
  _resetSyncQueueForTesting,
} from './sync-queue.js'

describe('sync-queue module', () => {
  beforeEach(() => {
    _resetSyncQueueForTesting({ online: true })
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  it('enqueues push state task and persists to localStorage', () => {
    const task = enqueuePushState({ userWeight: 80 })
    expect(task.type).toBe('push_state')
    expect(task.payload.state).toEqual({ userWeight: 80 })

    const q = getQueue()
    expect(q).toHaveLength(1)
    expect(q[0].payload.state).toEqual({ userWeight: 80 })
    expect(localStorage.getItem('gym_dirty')).toBe('1')
  })

  it('coalesces multiple push_state actions to retain the newest state', () => {
    enqueuePushState({ step: 1 })
    enqueuePushState({ step: 2 })
    enqueuePushState({ step: 3 })

    const q = getQueue()
    expect(q).toHaveLength(1)
    expect(q[0].payload.state).toEqual({ step: 3 })
  })

  it('clears queue when clearQueue is called', () => {
    enqueuePushState({ x: 1 })
    expect(getQueue()).toHaveLength(1)

    clearQueue()
    expect(getQueue()).toHaveLength(0)
    expect(getSyncStatus().pendingCount).toBe(0)
  })

  it('flushes queued state to backend via apiClient and removes dirty flag', async () => {
    enqueuePushState({ activeWorkout: true })

    const mockApi = vi.fn().mockResolvedValue({ ok: true })
    const res = await flushSyncQueue({ apiClient: mockApi })

    expect(res.flushed).toBe(1)
    expect(res.errors).toBe(0)
    expect(mockApi).toHaveBeenCalledWith('/api/data', {
      method: 'PUT',
      body: JSON.stringify({ state: { activeWorkout: true } }),
    })
    expect(getQueue()).toHaveLength(0)
    expect(localStorage.getItem('gym_dirty')).toBeNull()
    expect(getSyncStatus().lastSyncedAt).not.toBeNull()
  })

  it('retains queued tasks and increments retryCount if API request fails', async () => {
    enqueuePushState({ activeWorkout: true })

    const networkError = new TypeError('Failed to fetch')
    const mockApi = vi.fn().mockRejectedValue(networkError)
    const res = await flushSyncQueue({ apiClient: mockApi })

    expect(res.flushed).toBe(0)
    expect(res.errors).toBe(1)
    expect(getQueue()).toHaveLength(1)
    expect(getQueue()[0].retryCount).toBe(1)
  })

  it('does not duplicate queue items when multiple items fail without network abort', async () => {
    // Manually add 3 items to queue
    _resetSyncQueueForTesting({ online: true, pending: 3 })
    expect(getQueue()).toHaveLength(3)

    const serverError = new Error('500 Internal Server Error')
    serverError.status = 500
    const mockApi = vi.fn().mockRejectedValue(serverError)

    const res = await flushSyncQueue({ apiClient: mockApi })
    expect(res.flushed).toBe(0)
    expect(res.errors).toBe(3)
    // Must still have exactly 3 items, NO duplications!
    expect(getQueue()).toHaveLength(3)
  })

  it('preserves unprocessed remaining items when network error halts queue flush', async () => {
    _resetSyncQueueForTesting({ online: true, pending: 3 })
    expect(getQueue()).toHaveLength(3)

    let callCount = 0
    const mockApi = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) return { ok: true }
      const netErr = new TypeError('Failed to fetch')
      throw netErr
    })

    const res = await flushSyncQueue({ apiClient: mockApi })
    expect(res.flushed).toBe(1)
    expect(res.errors).toBe(1)
    // First item succeeded and removed; second failed; third untouched. Total left: 2!
    expect(getQueue()).toHaveLength(2)
  })

  it('notifies subscribers of status updates', () => {
    const listener = vi.fn()
    const unsub = subscribeSyncStatus(listener)

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
      })
    )

    enqueuePushState({ count: 1 })
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingCount: 1,
      })
    )

    unsub()
    enqueuePushState({ count: 2 })
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
