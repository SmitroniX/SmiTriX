/**
 * PWA Offline Background Queue Synchronization Manager
 * Manages an offline queue of state updates, listens to connectivity events,
 * registers Service Worker Background Sync, and auto-flushes queued syncs when online.
 */

import { api } from './api.js'

const QUEUE_STORAGE_KEY = 'gym_sync_queue'

let queue = []
try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(QUEUE_STORAGE_KEY) : null
  queue = raw ? JSON.parse(raw) : []
  if (!Array.isArray(queue)) queue = []
} catch {
  queue = []
}

let isOnlineState = typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true
let isSyncingState = false
let lastSyncedAtState = null
const subscribers = new Set()

function persistQueue() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
    }
  } catch { /* ignore quota errors */ }
}

function notifySubscribers() {
  const status = getSyncStatus()
  for (const fn of subscribers) {
    try { fn(status) } catch (e) { console.error('Sync status subscriber error', e) }
  }
}

export function getSyncStatus() {
  return {
    isOnline: isOnlineState,
    isSyncing: isSyncingState,
    pendingCount: queue.length,
    lastSyncedAt: lastSyncedAtState,
  }
}

export function subscribeSyncStatus(fn) {
  subscribers.add(fn)
  fn(getSyncStatus())
  return () => subscribers.delete(fn)
}

export function isOnline() {
  return isOnlineState
}

export function getQueue() {
  return [...queue]
}

export function clearQueue() {
  queue = []
  persistQueue()
  notifySubscribers()
}

/**
 * Register background sync tag with Service Worker if supported.
 */
export async function registerBackgroundSync() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    if (reg && 'sync' in reg && typeof reg.sync.register === 'function') {
      await reg.sync.register('smitrix-sync')
      return true
    }
  } catch {
    // Background Sync not permitted or failed
  }
  return false
}

/**
 * Enqueue a state synchronization task for offline replay.
 * Coalesces consecutive push_state actions to always sync the latest state.
 *
 * @param {Object} state - Application state snapshot
 * @returns {Object} Enqueued task
 */
export function enqueuePushState(state) {
  // If there is already a push_state task in queue, update it with the latest state
  const existingIdx = queue.findIndex(item => item.type === 'push_state')
  const task = {
    id: 'sync_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    type: 'push_state',
    payload: { state },
    createdAt: Date.now(),
    retryCount: 0,
  }

  if (existingIdx >= 0) {
    queue[existingIdx] = task
  } else {
    queue.push(task)
  }

  persistQueue()
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('gym_dirty', '1')
  }

  registerBackgroundSync().catch(() => {})
  notifySubscribers()
  return task
}

/**
 * Flush all pending offline sync tasks.
 *
 * @param {Object} [deps] - Optional dependency injection for testing
 * @param {Function} [deps.apiClient] - API caller
 * @returns {Promise<{ flushed: number, errors: number }>}
 */
export async function flushSyncQueue({ apiClient = api } = {}) {
  if (isSyncingState) return { flushed: 0, errors: 0 }
  if (!queue.length) {
    notifySubscribers()
    return { flushed: 0, errors: 0 }
  }

  isSyncingState = true
  notifySubscribers()

  let flushed = 0
  let errors = 0

  const remaining = []

  for (const item of queue) {
    try {
      if (item.type === 'push_state') {
        await apiClient('/api/data', {
          method: 'PUT',
          body: JSON.stringify({ state: item.payload.state }),
        })
        flushed++
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('gym_dirty')
        }
      }
    } catch (err) {
      errors++
      item.retryCount = (item.retryCount || 0) + 1
      remaining.push(item)
      // If we encounter a network error, stop flushing the rest of the queue
      if (err.name === 'TypeError' || err.status === 0 || !isOnlineState) {
        break
      }
    }
  }

  // Any items that were not processed stay in the queue
  const processedCount = flushed + (errors > 0 ? 1 : 0)
  queue = [...remaining, ...queue.slice(processedCount)]
  persistQueue()

  if (flushed > 0) {
    lastSyncedAtState = Date.now()
  }

  isSyncingState = false
  notifySubscribers()
  return { flushed, errors }
}

// Window event listeners for online and offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnlineState = true
    notifySubscribers()
    flushSyncQueue().catch(() => {})
  })

  window.addEventListener('offline', () => {
    isOnlineState = false
    notifySubscribers()
  })

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'BACKGROUND_SYNC_TRIGGER') {
        flushSyncQueue().catch(() => {})
      }
    })
  }
}

/**
 * Set internal sync status directly for testing.
 */
export function _setSyncStatusForTesting({ online = true, syncing = false, pending = 0, lastSynced = null } = {}) {
  isOnlineState = Boolean(online)
  isSyncingState = Boolean(syncing)
  if (pending > 0) {
    queue = Array(pending).fill(null).map((_, i) => ({
      id: 'mock_' + i,
      type: 'push_state',
      payload: { state: {} },
      createdAt: Date.now(),
      retryCount: 0,
    }))
  } else {
    queue = []
  }
  lastSyncedAtState = lastSynced
  notifySubscribers()
}

export function _resetSyncQueueForTesting(opts) {
  _setSyncStatusForTesting(opts)
  subscribers.clear()
}
