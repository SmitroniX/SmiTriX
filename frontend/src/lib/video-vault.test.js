import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveVideo,
  getVideo,
  updateVideoTrim,
  deleteVideo,
  listVideos,
  clearAllVideos,
  generateVideoId,
  _resetVaultDbForTesting,
} from './video-vault.js'

function setupMockIndexedDb() {
  const storeData = new Map()

  const mockStore = {
    add: record => {
      const req = { onsuccess: null, onerror: null }
      setTimeout(() => {
        storeData.set(record.id, record)
        if (req.onsuccess) req.onsuccess({ target: req })
      }, 0)
      return req
    },
    get: id => {
      const req = { result: storeData.get(id) || null, onsuccess: null, onerror: null }
      setTimeout(() => {
        req.result = storeData.get(id) || null
        if (req.onsuccess) req.onsuccess({ target: req })
      }, 0)
      return req
    },
    put: record => {
      const req = { onsuccess: null, onerror: null }
      setTimeout(() => {
        storeData.set(record.id, record)
        if (req.onsuccess) req.onsuccess({ target: req })
      }, 0)
      return req
    },
    delete: id => {
      const req = { onsuccess: null, onerror: null }
      setTimeout(() => {
        storeData.delete(id)
        if (req.onsuccess) req.onsuccess({ target: req })
      }, 0)
      return req
    },
    clear: () => {
      const req = { onsuccess: null, onerror: null }
      setTimeout(() => {
        storeData.clear()
        if (req.onsuccess) req.onsuccess({ target: req })
      }, 0)
      return req
    },
    openCursor: () => {
      const items = Array.from(storeData.values()).reverse()
      let idx = 0
      const req = { onsuccess: null, onerror: null }

      function emitNext() {
        if (idx < items.length) {
          const item = items[idx++]
          const cursor = {
            value: item,
            continue: () => setTimeout(emitNext, 0),
          }
          if (req.onsuccess) req.onsuccess({ target: { result: cursor } })
        } else {
          if (req.onsuccess) req.onsuccess({ target: { result: null } })
        }
      }

      setTimeout(emitNext, 0)
      return req
    },
    createIndex: () => {},
  }

  const mockDb = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => mockStore,
    transaction: () => ({
      objectStore: () => mockStore,
    }),
  }

  globalThis.indexedDB = {
    open: () => {
      const req = {
        result: mockDb,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      }
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ target: req })
      }, 0)
      return req
    },
  }

  return storeData
}

describe('video-vault module', () => {
  let storeData

  beforeEach(() => {
    _resetVaultDbForTesting()
    storeData = setupMockIndexedDb()
  })

  it('generates unique video IDs', () => {
    const id1 = generateVideoId()
    const id2 = generateVideoId()
    expect(id1.startsWith('vid_')).toBe(true)
    expect(id1).not.toBe(id2)
  })

  it('saves video blob with metadata to vault', async () => {
    const fakeBlob = new Blob(['sample-video-content'], { type: 'video/mp4' })
    const res = await saveVideo({
      blob: fakeBlob,
      exerciseId: 'squat',
      exerciseName: 'Barbell Back Squat',
      setIndex: 2,
      isPR: true,
      weight: 140,
      reps: 5,
      durationSec: 15.5,
    })

    expect(res.id).toBeDefined()
    expect(res.exerciseId).toBe('squat')
    expect(res.isPR).toBe(true)
    expect(res.weight).toBe(140)
    expect(res.reps).toBe(5)
    expect(res.durationSec).toBe(15.5)
    expect(storeData.has(res.id)).toBe(true)
  })

  it('throws when saving null blob', async () => {
    await expect(saveVideo({ blob: null })).rejects.toThrow('Video blob is required')
  })

  it('retrieves saved video by id', async () => {
    const fakeBlob = new Blob(['video-bytes'], { type: 'video/webm' })
    const saved = await saveVideo({
      blob: fakeBlob,
      exerciseId: 'bench-press',
      isPR: false,
    })

    const retrieved = await getVideo(saved.id)
    expect(retrieved).toBeTruthy()
    expect(retrieved.id).toBe(saved.id)
    expect(retrieved.exerciseId).toBe('bench-press')
  })

  it('returns null for non-existent video id', async () => {
    const res = await getVideo('non-existent-id')
    expect(res).toBeNull()
  })

  it('updates video trim timestamps', async () => {
    const fakeBlob = new Blob(['video-bytes'], { type: 'video/mp4' })
    const saved = await saveVideo({
      blob: fakeBlob,
      exerciseId: 'deadlift',
      durationSec: 20,
    })

    const updated = await updateVideoTrim(saved.id, 2.5, 18.0)
    expect(updated.trimStartSec).toBe(2.5)
    expect(updated.trimEndSec).toBe(18.0)

    const check = await getVideo(saved.id)
    expect(check.trimStartSec).toBe(2.5)
    expect(check.trimEndSec).toBe(18.0)
  })

  it('deletes video from vault', async () => {
    const fakeBlob = new Blob(['video-bytes'], { type: 'video/mp4' })
    const saved = await saveVideo({
      blob: fakeBlob,
      exerciseId: 'overhead-press',
    })

    expect(storeData.has(saved.id)).toBe(true)
    const ok = await deleteVideo(saved.id)
    expect(ok).toBe(true)
    expect(storeData.has(saved.id)).toBe(false)
  })

  it('lists videos and filters by exerciseId', async () => {
    const blob1 = new Blob(['v1'], { type: 'video/mp4' })
    const blob2 = new Blob(['v2'], { type: 'video/mp4' })

    await saveVideo({ blob: blob1, exerciseId: 'squat', isPR: true })
    await saveVideo({ blob: blob2, exerciseId: 'bench', isPR: false })

    const all = await listVideos()
    expect(all).toHaveLength(2)
    // By default, blob property is omitted in list view to conserve memory
    expect(all[0].blob).toBeUndefined()
    expect(all[0].exerciseId).toBeDefined()

    const squats = await listVideos({ exerciseId: 'squat' })
    expect(squats).toHaveLength(1)
    expect(squats[0].exerciseId).toBe('squat')
  })

  it('clears all videos from vault', async () => {
    await saveVideo({ blob: new Blob(['1']), exerciseId: 'e1' })
    await saveVideo({ blob: new Blob(['2']), exerciseId: 'e2' })
    expect(storeData.size).toBe(2)

    await clearAllVideos()
    expect(storeData.size).toBe(0)
  })
})
