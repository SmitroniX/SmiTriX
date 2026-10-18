/**
 * Compound Lift Form Check Video Vault
 * 100% client-side privacy-first IndexedDB storage for workout set video recordings.
 * Videos are stored locally in the user's browser and NEVER transmitted to the server.
 */

const DB_NAME = 'smitrix_vault_v1'
const DB_VERSION = 1
const STORE_NAME = 'form_videos'

let dbPromise = null

export function _resetVaultDbForTesting() {
  dbPromise = null
}

export function getVaultDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = event => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('exerciseId', 'exerciseId', { unique: false })
        store.createIndex('workoutId', 'workoutId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = event => {
      resolve(event.target.result)
    }

    request.onerror = event => {
      dbPromise = null
      reject(event.target.error || new Error('Failed to open Video Vault IndexedDB'))
    }
  })

  return dbPromise
}

/**
 * Generate a collision-resistant unique video identifier.
 */
export function generateVideoId() {
  return 'vid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

/**
 * Save a form check video clip to local IndexedDB.
 *
 * @param {Object} params
 * @param {Blob|File} params.blob - Binary video data
 * @param {string} [params.exerciseId] - Exercise ID (e.g. 'squat')
 * @param {string} [params.exerciseName] - Human-readable exercise name
 * @param {number} [params.setIndex] - 0-indexed set index
 * @param {boolean} [params.isPR] - Whether this was a personal record set
 * @param {string} [params.workoutId] - Parent workout/routine ID
 * @param {number} [params.weight] - Logged weight for set
 * @param {number} [params.reps] - Logged reps for set
 * @param {number} [params.durationSec] - Video duration in seconds
 * @param {number} [params.trimStartSec] - Trim start offset
 * @param {number} [params.trimEndSec] - Trim end offset
 * @returns {Promise<Object>} Video metadata record
 */
export async function saveVideo({
  blob,
  exerciseId = '',
  exerciseName = '',
  setIndex = 0,
  isPR = false,
  workoutId = '',
  weight = 0,
  reps = 0,
  durationSec = 0,
  trimStartSec = 0,
  trimEndSec = 0,
}) {
  if (!blob) throw new Error('Video blob is required')

  const db = await getVaultDb()
  const id = generateVideoId()
  const record = {
    id,
    blob,
    exerciseId: String(exerciseId || ''),
    exerciseName: String(exerciseName || ''),
    setIndex: Number(setIndex) || 0,
    isPR: Boolean(isPR),
    workoutId: String(workoutId || ''),
    weight: Number(weight) || 0,
    reps: Number(reps) || 0,
    durationSec: Number(durationSec) || 0,
    trimStartSec: Number(trimStartSec) || 0,
    trimEndSec: Number(trimEndSec) || (Number(durationSec) || 0),
    sizeBytes: blob.size || 0,
    mimeType: blob.type || 'video/mp4',
    createdAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add(record)

    req.onsuccess = () => {
      resolve({ ...record })
    }
    req.onerror = () => {
      reject(req.error || new Error('Failed to save video to Vault'))
    }
  })
}

/**
 * Retrieve a full video record including the video Blob.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getVideo(id) {
  if (!id) return null
  const db = await getVaultDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)

    req.onsuccess = () => {
      resolve(req.result || null)
    }
    req.onerror = () => {
      reject(req.error || new Error('Failed to load video from Vault'))
    }
  })
}

/**
 * Update video trim metadata.
 */
export async function updateVideoTrim(id, trimStartSec, trimEndSec) {
  const video = await getVideo(id)
  if (!video) throw new Error('Video not found')

  video.trimStartSec = Number(trimStartSec) || 0
  video.trimEndSec = Number(trimEndSec) || video.durationSec

  const db = await getVaultDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(video)

    req.onsuccess = () => resolve(video)
    req.onerror = () => reject(req.error || new Error('Failed to update video trim'))
  })
}

/**
 * Delete a video from IndexedDB.
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteVideo(id) {
  if (!id) return false
  const db = await getVaultDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)

    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error || new Error('Failed to delete video'))
  })
}

/**
 * List all form check videos, ordered newest first (without holding heavy blobs by default).
 *
 * @param {Object} [filter]
 * @param {string} [filter.exerciseId]
 * @param {boolean} [filter.includeBlob=false]
 * @returns {Promise<Array<Object>>}
 */
export async function listVideos({ exerciseId = null, includeBlob = false } = {}) {
  const db = await getVaultDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.openCursor(null, 'prev')
    const results = []

    req.onsuccess = event => {
      const cursor = event.target.result
      if (cursor) {
        const val = cursor.value
        if (!exerciseId || val.exerciseId === exerciseId) {
          if (includeBlob) {
            results.push(val)
          } else {
            const { blob, ...meta } = val
            results.push(meta)
          }
        }
        cursor.continue()
      } else {
        resolve(results)
      }
    }

    req.onerror = () => {
      reject(req.error || new Error('Failed to list form check videos'))
    }
  })
}

/**
 * Clear all videos from the vault (for testing or user data wipe).
 */
export async function clearAllVideos() {
  const db = await getVaultDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.clear()

    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error || new Error('Failed to clear video vault'))
  })
}
