import { useState, useRef } from 'react'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { t } from '../lib/i18n.js'

const APP_GUIDES = [
  {
    id: 'hevy',
    name: 'Hevy',
    steps: 'Profile → Settings → Export & Import Data → Export Workouts',
    extra: 'or use direct API key',
  },
  {
    id: 'strong',
    name: 'Strong',
    steps: 'Settings → Export Workouts',
  },
  {
    id: 'fitnotes',
    name: 'FitNotes',
    steps: 'Settings → Backup → Export CSV',
  },
  {
    id: 'apple',
    name: 'Apple Health',
    steps: 'Export data → export.xml / bodyweight CSV',
  },
]

export default function ImportHubSheet({ close, onFile, onHevyApi }) {
  const [activeApp, setActiveApp] = useState('hevy')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = file => {
    if (!file) return
    onFile?.(file)
    close?.()
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragEnter = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  return (
    <div className="import-hub-sheet">
      <div className="row between" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>{t('Import Workout Data')}</h3>
        <button className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>
      <div className="muted small" style={{ marginBottom: 16, lineHeight: 1.45 }}>
        {t('Migrate your workouts, routines, and bodyweight from other apps')}
      </div>

      {/* Quick app guides with pills / accordion */}
      <div className="chips" role="tablist" style={{ marginBottom: 10 }}>
        {APP_GUIDES.map(app => (
          <button
            key={app.id}
            type="button"
            role="tab"
            aria-selected={activeApp === app.id}
            aria-expanded={activeApp === app.id}
            className={'chip' + (activeApp === app.id ? ' on' : '')}
            onClick={() => setActiveApp(prev => prev === app.id ? null : app.id)}
          >
            {app.name}
          </button>
        ))}
      </div>

      <div className="import-accordion" style={{ marginBottom: 16 }}>
        {APP_GUIDES.map(app => (
          <div
            key={app.id}
            id={`guide-${app.id}`}
            role="tabpanel"
            className="import-guide-item accordion-content"
            style={{
              display: activeApp === app.id ? 'block' : 'none',
              background: 'var(--surface)',
              borderRadius: 'var(--r)',
              padding: '12px 14px',
              border: '1px solid var(--sep-op)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--label)', fontSize: 14 }}>{app.name}</span>
              <span className="dim small">{t('Export guide')}</span>
            </div>
            <div style={{ color: 'var(--label-2)', fontSize: 13, lineHeight: 1.5 }}>
              {app.steps}{app.extra ? ` ${app.extra}` : ''}
            </div>
          </div>
        ))}
        {!activeApp && (
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--r)',
            padding: '10px 14px',
            border: '1px dashed var(--sep-op)',
            color: 'var(--label-3)',
            fontSize: 13,
            textAlign: 'center',
          }}>
            {t('Select an app above to view export instructions')}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xml,text/csv,text/xml"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {/* Drag & drop / tap dropzone */}
      <div
        className={`file-dropzone${dragOver ? ' drag-over' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label={t('Upload workout file')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '24px 16px',
          borderRadius: 'var(--r-lg)',
          background: dragOver ? 'var(--surface-2)' : 'var(--surface)',
          border: `2px dashed ${dragOver ? 'var(--acc)' : 'var(--sep)'}`,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'border-color var(--fast), background var(--fast)',
          marginBottom: 16,
          minHeight: 120,
        }}
      >
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--acc-soft)',
          color: 'var(--acc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}>
          <Icon name="upload" />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--label)', marginBottom: 2 }}>
            {t('Choose file or drag & drop')}
          </div>
          <div className="dim small">
            {t('.csv or .xml export files')}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <Button variant="tinted" icon="key" onClick={onHevyApi}>
        {t('Import with Hevy API')}
      </Button>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={close}>
        {t('Cancel')}
      </Button>
    </div>
  )
}
