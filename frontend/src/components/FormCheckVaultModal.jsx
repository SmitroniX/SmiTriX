import { useState, useEffect, useRef } from 'react'
import {
  getVideo,
  saveVideo,
  deleteVideo,
  updateVideoTrim,
} from '../lib/video-vault.js'
import { t } from '../lib/i18n.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'

/**
 * Format seconds as mm:ss.d
 */
function fmtTime(sec = 0) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ds = Math.floor((sec % 1) * 10)
  return `${m}:${s.toString().padStart(2, '0')}.${ds}`
}

/**
 * Video Player Modal with scrubbing, speed control (slow motion), trimming,
 * export/download, and local deletion.
 */
export function FormCheckPlayerModal({
  videoId,
  setInfo = {},
  onDetach,
  close,
}) {
  const [videoData, setVideoData] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [savingTrim, setSavingTrim] = useState(false)
  const [showTrimTool, setShowTrimTool] = useState(false)

  const videoRef = useRef(null)

  useEffect(() => {
    let active = true
    let createdUrl = ''

    async function load() {
      setLoading(true)
      try {
        const item = await getVideo(videoId)
        if (!active) return
        if (!item || !item.blob) {
          setError(t('Video not found in local vault.'))
          return
        }
        setVideoData(item)
        setTrimStart(item.trimStartSec || 0)
        setTrimEnd(item.trimEndSec || item.durationSec || 0)
        createdUrl = URL.createObjectURL(item.blob)
        setVideoUrl(createdUrl)
      } catch (err) {
        if (active) setError(err.message || 'Failed to load video')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [videoId])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      if (trimEnd > 0 && v.currentTime >= trimEnd) {
        v.currentTime = trimStart
      }
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (showTrimTool && trimEnd > trimStart && v.currentTime >= trimEnd) {
      v.currentTime = trimStart
      v.play().catch(() => {})
    }
  }

  const handleLoadedMetadata = () => {
    const v = videoRef.current
    if (!v) return
    const dur = v.duration || videoData?.durationSec || 0
    setDuration(dur)
    if (!videoData?.trimEndSec) {
      setTrimEnd(dur)
    }
  }

  const handleSeek = e => {
    const v = videoRef.current
    const target = parseFloat(e.target.value)
    if (v) v.currentTime = target
    setCurrentTime(target)
  }

  const changeSpeed = rate => {
    setPlaybackRate(rate)
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
    }
  }

  const handleSaveTrim = async () => {
    if (!videoId) return
    setSavingTrim(true)
    try {
      await updateVideoTrim(videoId, trimStart, trimEnd)
      useUI.getState().toast(t('Video trim saved!'))
      setShowTrimTool(false)
    } catch {
      useUI.getState().toast(t('Failed to save trim'))
    } finally {
      setSavingTrim(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('Delete this form check video permanently from your device?'))) return
    try {
      await deleteVideo(videoId)
      if (onDetach) onDetach(videoId)
      useUI.getState().toast(t('Video removed from Vault'))
      close()
    } catch {
      useUI.getState().toast(t('Failed to delete video'))
    }
  }

  return (
    <div className="sheet-content form-check-modal" style={{ padding: '16px 20px 24px', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="video" style={{ color: 'var(--blue)' }} />
            <span>{videoData?.exerciseName || setInfo.exerciseName || t('Form Check Video')}</span>
            {(videoData?.isPR || setInfo.isPR) && (
              <span className="set-pr-tag animate-pop" style={{ fontSize: 11, padding: '2px 6px' }}>
                <Icon name="trophy" size={11} /> PR
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>
            {setInfo.weight > 0 && `${setInfo.weight} ${setInfo.unit || ''} × `}
            {setInfo.reps ? `${setInfo.reps} ${t('reps')}` : ''}
            {videoData?.createdAt && ` · ${new Date(videoData.createdAt).toLocaleDateString()}`}
          </div>
        </div>
        <button className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--label-2)' }}>
          <div className="live-workout-pulse" style={{ margin: '0 auto 12px' }} />
          <span>{t('Loading video from local vault…')}</span>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '16px', color: 'var(--red)', background: 'color-mix(in srgb, var(--red) 12%, transparent)' }}>
          {error}
        </div>
      )}

      {!loading && !error && videoUrl && (
        <div>
          {/* HTML5 Video Player Container */}
          <div style={{
            position: 'relative',
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
            aspectRatio: '16/9',
            maxHeight: '45vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
            />

            {/* Play/Pause Overlay Button */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label={t('Play')}
                style={{
                  position: 'absolute',
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: 'rgba(0,0,0,0.6)',
                  border: '2px solid rgba(255,255,255,0.8)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="play" size={24} style={{ marginLeft: 3 }} />
              </button>
            )}
          </div>

          {/* Scrubber Bar */}
          <div style={{ marginTop: 10, padding: '0 4px' }}>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              style={{ width: '100%', accentColor: 'var(--blue)', cursor: 'pointer' }}
              aria-label={t('Video scrubber')}
            />
            <div className="row between" style={{ fontSize: 11, color: 'var(--label-2)', marginTop: 2 }}>
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>

          {/* Speed & Slow Motion Controls */}
          <div className="row between" style={{ marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)' }}>
              {t('Playback Speed')}:
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0.25, 0.5, 1.0, 1.5].map(rate => (
                <button
                  key={rate}
                  type="button"
                  className={'chip' + (playbackRate === rate ? ' on' : '')}
                  onClick={() => changeSpeed(rate)}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 6,
                    background: playbackRate === rate ? 'var(--blue)' : 'var(--surface-2)',
                    color: playbackRate === rate ? '#fff' : 'var(--label)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {rate === 0.25 || rate === 0.5 ? `${rate}× (${t('Slow')})` : `${rate}×`}
                </button>
              ))}
            </div>
          </div>

          {/* Trim Section Toggle */}
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn full sm"
              onClick={() => setShowTrimTool(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'var(--surface-2)',
                color: 'var(--label)',
              }}
            >
              <Icon name="pencil" size={13} />
              <span>{showTrimTool ? t('Hide Trim Tool') : t('Trim Video Clip')}</span>
            </button>
          </div>

          {showTrimTool && (
            <div className="card" style={{ marginTop: 10, padding: '12px 14px', background: 'var(--surface-2)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('Trim Video Range')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--label-2)', display: 'block', marginBottom: 2 }}>
                    {t('Start Time')}: {fmtTime(trimStart)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={trimEnd > 0 ? trimEnd - 0.5 : duration}
                    step="0.1"
                    value={trimStart}
                    onChange={e => setTrimStart(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--green)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--label-2)', display: 'block', marginBottom: 2 }}>
                    {t('End Time')}: {fmtTime(trimEnd)}
                  </label>
                  <input
                    type="range"
                    min={trimStart + 0.5}
                    max={duration || 100}
                    step="0.1"
                    value={trimEnd}
                    onChange={e => setTrimEnd(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--orange)' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn primary sm"
                  disabled={savingTrim}
                  onClick={handleSaveTrim}
                >
                  {savingTrim ? t('Saving…') : t('Save Trim')}
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = trimStart
                      videoRef.current.play().catch(() => {})
                    }
                  }}
                >
                  {t('Preview Trim')}
                </button>
              </div>
            </div>
          )}

          {/* Action Row: Export & Delete */}
          <div className="row between" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <a
              href={videoUrl}
              download={`formcheck-${(videoData?.exerciseName || 'lift').toLowerCase().replace(/\s+/g, '-')}.mp4`}
              className="btn sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
              }}
            >
              <Icon name="download" size={13} />
              <span>{t('Export Video')}</span>
            </a>

            <button
              type="button"
              className="btn sm danger"
              onClick={handleDelete}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="trash" size={13} />
              <span>{t('Delete')}</span>
            </button>
          </div>

          {/* Privacy Note */}
          <div style={{ fontSize: 11, color: 'var(--label-3)', textAlign: 'center', marginTop: 14 }}>
            🔒 {t('Privacy-First: Video stored 100% locally in IndexedDB and never uploaded.')}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Form Check Recorder / Uploader Modal.
 * Supports HTML5 MediaRecorder (live camera) or local video file selection.
 */
export function FormCheckRecordModal({
  exerciseId,
  exerciseName,
  setIndex,
  isPR = false,
  workoutId,
  weight,
  reps,
  onAttached,
  close,
}) {
  const [mode, setMode] = useState('choose') // 'choose' | 'camera' | 'preview'
  const [stream, setStream] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordSec, setRecordSec] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const videoPreviewRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  // Cleanup stream and preview URL on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stream, previewUrl])

  const startCamera = async () => {
    setCameraError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      setStream(s)
      setMode('camera')
      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = s
          videoPreviewRef.current.play().catch(() => {})
        }
      }, 100)
    } catch (err) {
      setCameraError(err.message || t('Could not access camera. Please allow camera permissions.'))
    }
  }

  const startRecording = () => {
    if (!stream) return
    chunksRef.current = []
    try {
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4'

      const mr = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorderRef.current = mr

      mr.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime })
        setRecordedBlob(blob)
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setMode('preview')
        if (stream) {
          stream.getTracks().forEach(t => t.stop())
          setStream(null)
        }
      }

      mr.start(250) // collect chunks every 250ms
      setRecording(true)
      setRecordSec(0)
      timerRef.current = setInterval(() => setRecordSec(s => s + 1), 1000)
    } catch (err) {
      setCameraError(err.message || 'MediaRecorder failed to start')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleFileChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setRecordedBlob(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setMode('preview')
  }

  const handleSaveAndAttach = async () => {
    if (!recordedBlob) return
    setSaving(true)
    try {
      const saved = await saveVideo({
        blob: recordedBlob,
        exerciseId,
        exerciseName,
        setIndex,
        isPR,
        workoutId,
        weight,
        reps,
        durationSec: recordSec || 10,
      })

      if (onAttached) onAttached(saved.id)
      useUI.getState().toast(t('Form check video attached to set!'))
      close()
    } catch {
      useUI.getState().toast(t('Failed to save video to vault'))
    } finally {
      setSaving(false)
    }
  }

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setRecordedBlob(null)
    setMode('choose')
  }

  return (
    <div className="sheet-content form-check-record-modal" style={{ padding: '16px 20px 24px', maxWidth: 480, margin: '0 auto' }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="video" style={{ color: 'var(--blue)' }} />
          <span>{t('Record Form Check')}</span>
        </div>
        <button className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      {cameraError && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 14, color: 'var(--red)', background: 'color-mix(in srgb, var(--red) 12%, transparent)' }}>
          {cameraError}
        </div>
      )}

      {mode === 'choose' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ color: 'var(--label-2)', fontSize: 13, marginBottom: 20 }}>
            {t('Record a lift clip with your camera or select an existing video file.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              className="btn primary"
              onClick={startCamera}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px' }}
            >
              <Icon name="camera" size={18} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>{t('Open Camera & Record')}</span>
            </button>

            <label
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px',
                cursor: 'pointer',
                background: 'var(--surface-2)',
              }}
            >
              <Icon name="upload" size={18} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>{t('Choose Video File')}</span>
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div style={{ fontSize: 11, color: 'var(--label-3)', marginTop: 24 }}>
            🔒 {t('Videos stay 100% on your device in IndexedDB.')}
          </div>
        </div>
      )}

      {mode === 'camera' && (
        <div>
          <div style={{
            position: 'relative',
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
            aspectRatio: '16/9',
            maxHeight: '40vh',
          }}>
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {recording && (
              <div style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: 'rgba(239, 68, 68, 0.85)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span className="live-workout-pulse" style={{ background: '#fff', width: 8, height: 8 }} />
                <span>{fmtTime(recordSec)}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 12 }}>
            {!recording ? (
              <button
                type="button"
                className="btn primary"
                onClick={startRecording}
                style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 6, background: '#fff' }} />
                <span>{t('Start Recording')}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn danger"
                onClick={stopRecording}
                style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fff' }} />
                <span>{t('Stop Recording')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div>
          <div style={{
            position: 'relative',
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
            aspectRatio: '16/9',
            maxHeight: '40vh',
          }}>
            <video
              src={previewUrl}
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn primary full"
              disabled={saving}
              onClick={handleSaveAndAttach}
            >
              {saving ? t('Saving…') : t('Save to Vault & Attach')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={retake}
              disabled={saving}
            >
              {t('Retake')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Attached Video Badge on Set Rows.
 */
export function FormCheckBadge({ videoId, onClick }) {
  if (!videoId) return null

  return (
    <button
      type="button"
      className="form-check-badge-tag animate-pop"
      onClick={e => {
        e.stopPropagation()
        if (onClick) onClick()
      }}
      title={t('Watch Form Check Video')}
      aria-label={t('Watch Form Check Video')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        borderRadius: 6,
        background: 'color-mix(in srgb, var(--blue) 20%, var(--surface-2))',
        border: '1px solid var(--blue)',
        color: 'var(--blue)',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <Icon name="video" size={11} />
      <span>{t('Form Check')}</span>
    </button>
  )
}

/**
 * Open Form Check Player Modal in UI sheet manager
 */
export function openFormCheckPlayer({ videoId, setInfo, onDetach }) {
  useUI.getState().openSheet(close => (
    <FormCheckPlayerModal
      videoId={videoId}
      setInfo={setInfo}
      onDetach={onDetach}
      close={close}
    />
  ))
}

/**
 * Open Form Check Recorder Modal in UI sheet manager
 */
export function openFormCheckRecorder({
  exerciseId,
  exerciseName,
  setIndex,
  isPR,
  workoutId,
  weight,
  reps,
  onAttached,
}) {
  useUI.getState().openSheet(close => (
    <FormCheckRecordModal
      exerciseId={exerciseId}
      exerciseName={exerciseName}
      setIndex={setIndex}
      isPR={isPR}
      workoutId={workoutId}
      weight={weight}
      reps={reps}
      onAttached={onAttached}
      close={close}
    />
  ))
}
