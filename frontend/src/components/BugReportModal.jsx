import { useState, useRef } from 'react'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { t } from '../lib/i18n.js'
import { useUI } from '../store/useUI.js'
import { submitCloudBugReport } from '../lib/firebase.js'

function compressImage(file, maxDim = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        let w = img.width || 600
        let h = img.height || 600
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim }
          else { w = Math.round((w * maxDim) / h); h = maxDim }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function BugReportModal({ user, close }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('bug')
  const [severity, setSeverity] = useState('medium')
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const categories = [
    { id: 'bug', label: t('Bug / Crash') },
    { id: 'ui', label: t('UI / Design') },
    { id: 'sync', label: t('Cloud Sync') },
    { id: 'feature', label: t('Feedback / Idea') },
    { id: 'other', label: t('Other') },
  ]

  const severities = [
    { id: 'low', label: t('Low'), color: '#38bdf8' },
    { id: 'medium', label: t('Medium'), color: '#fbbf24' },
    { id: 'high', label: t('High'), color: '#f97316' },
    { id: 'critical', label: t('Critical'), color: '#ef4444' },
  ]

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setScreenshotDataUrl(compressed)
      useUI.getState().toast(t('Screenshot attached'))
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to attach screenshot'))
    } finally {
      e.target.value = ''
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!title.trim() && !description.trim()) {
      useUI.getState().toast(t('Please write a brief summary or description'))
      return
    }

    setSubmitting(true)
    try {
      await submitCloudBugReport({
        title: title.trim() || description.trim().slice(0, 60),
        description: description.trim(),
        category,
        severity,
        screenshotDataUrl,
        user,
        appVersion: '1.7.4',
        route: window.location.hash || window.location.pathname || 'profile'
      })
      useUI.getState().toast(t('Report submitted to cloud! Thank you for helping improve SmiTriX.'))
      close()
    } catch (err) {
      useUI.getState().toast(err.message || t('Failed to submit report. Please check network connection.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '4px 2px' }}>
      <div className="row between" style={{ alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon name="warning" style={{ fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--label)' }}>
              {t('Report an Issue')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--label-2)' }}>
              {t('Direct to SmiTriX Cloud Admin')}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          style={{
            background: 'var(--surface-2)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--label-2)',
            cursor: 'pointer'
          }}
        >
          <Icon name="xmark" style={{ fontSize: 15 }} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Category Picker */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)', display: 'block', marginBottom: 6 }}>
            {t('Category')}
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(c => {
              const active = category === c.id
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: active ? '1px solid var(--acc)' : '1px solid var(--sep-op)',
                    background: active ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface-2)',
                    color: active ? 'var(--acc)' : 'var(--label-2)',
                    cursor: 'pointer'
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Severity Picker */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)', display: 'block', marginBottom: 6 }}>
            {t('Severity')}
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {severities.map(s => {
              const active = severity === s.id
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: active ? `1px solid ${s.color}` : '1px solid var(--sep-op)',
                    background: active ? `${s.color}22` : 'var(--surface-2)',
                    color: active ? s.color : 'var(--label-2)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)', display: 'block', marginBottom: 4 }}>
            {t('Short Summary')}
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('e.g., Workout timer paused unexpectedly')}
            maxLength={120}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              border: '1px solid var(--sep-op)',
              borderRadius: 8,
              padding: '10px 12px',
              color: 'var(--label)',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)', display: 'block', marginBottom: 4 }}>
            {t('Details / Reproduction Steps')}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('Describe what happened, what device you are on, or what you were doing...')}
            rows={4}
            maxLength={1500}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              border: '1px solid var(--sep-op)',
              borderRadius: 8,
              padding: '10px 12px',
              color: 'var(--label)',
              fontSize: 13,
              lineHeight: 1.4,
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Screenshot Attachment */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {screenshotDataUrl ? (
            <div style={{ position: 'relative', display: 'inline-block', marginTop: 4 }}>
              <img
                src={screenshotDataUrl}
                alt="Screenshot preview"
                style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--sep-op)' }}
              />
              <button
                type="button"
                onClick={() => setScreenshotDataUrl('')}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon name="xmark" style={{ fontSize: 13 }} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px dashed var(--sep-op)',
                color: 'var(--label-2)',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Icon name="camera" style={{ fontSize: 15 }} />
              <span>{t('Attach Screenshot (Optional)')}</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Button
            type="button"
            variant="ghost"
            style={{ flex: 1 }}
            onClick={close}
            disabled={submitting}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            style={{ flex: 2 }}
            disabled={submitting}
          >
            {submitting ? t('Submitting...') : t('Submit Report')}
          </Button>
        </div>
      </form>
    </div>
  )
}
