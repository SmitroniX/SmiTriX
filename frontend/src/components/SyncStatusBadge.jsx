import { useState, useEffect } from 'react'
import {
  subscribeSyncStatus,
  flushSyncQueue,
  getSyncStatus,
  isOnline,
} from '../lib/sync-queue.js'
import { t } from '../lib/i18n.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'

export function SyncDetailsSheet({ close }) {
  const [status, setStatus] = useState(() => getSyncStatus())
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  useEffect(() => {
    return subscribeSyncStatus(setStatus)
  }, [])

  const handleManualSync = async () => {
    setIsManualSyncing(true)
    try {
      const res = await flushSyncQueue()
      if (res.flushed > 0) {
        useUI.getState().toast(t('All changes synced successfully!'))
      } else if (res.errors > 0) {
        useUI.getState().toast(t('Sync failed — will retry automatically'))
      } else {
        useUI.getState().toast(t('Already up to date'))
      }
    } finally {
      setIsManualSyncing(false)
    }
  }

  return (
    <div className="sheet-content sync-details-sheet" style={{ padding: '16px 20px 24px' }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 16,
            background: status.isOnline ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--orange) 15%, transparent)',
            color: status.isOnline ? 'var(--green)' : 'var(--orange)'
          }}>
            <Icon name={status.isOnline ? 'cloud' : 'cloudOff'} size={18} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{t('Offline & Cloud Sync')}</div>
            <div style={{ fontSize: 12, color: 'var(--label-2)' }}>
              {status.isOnline ? t('Online — ready to sync') : t('Offline mode active')}
            </div>
          </div>
        </div>
        <button className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: 16, background: 'var(--surface-2)' }}>
        <div className="row between" style={{ marginBottom: 8, fontSize: 13 }}>
          <span className="dim">{t('Connection Status')}:</span>
          <span style={{ fontWeight: 600, color: status.isOnline ? 'var(--green)' : 'var(--orange)' }}>
            {status.isOnline ? t('Connected') : t('Offline')}
          </span>
        </div>
        <div className="row between" style={{ marginBottom: 8, fontSize: 13 }}>
          <span className="dim">{t('Pending Offline Updates')}:</span>
          <span style={{ fontWeight: 700 }}>{status.pendingCount}</span>
        </div>
        <div className="row between" style={{ fontSize: 13 }}>
          <span className="dim">{t('Last Synced')}:</span>
          <span className="dim">
            {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleTimeString() : t('Not yet in this session')}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--label-2)', lineHeight: 1.4, marginBottom: 16 }}>
        {t('When training in gyms with poor signal, SmiTriX records all sets, workouts, and PRs locally. As soon as connectivity returns, your background queue flushes automatically.')}
      </p>

      <button
        type="button"
        className="btn primary full"
        disabled={!status.isOnline || status.isSyncing || isManualSyncing}
        onClick={handleManualSync}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Icon name="arrowRotate" size={14} className={status.isSyncing || isManualSyncing ? 'spin' : ''} />
        <span>{status.isSyncing || isManualSyncing ? t('Syncing…') : t('Sync Now')}</span>
      </button>
    </div>
  )
}

export function openSyncDetailsSheet() {
  useUI.getState().openSheet(close => <SyncDetailsSheet close={close} />)
}

/**
 * Offline / Syncing badge indicator rendered in headers or status bars.
 */
export function SyncStatusBadge({ showWhenSynced = false, onClick }) {
  const [status, setStatus] = useState(() => getSyncStatus())

  useEffect(() => {
    return subscribeSyncStatus(setStatus)
  }, [])

  const handleClick = e => {
    if (onClick) onClick(e)
    else openSyncDetailsSheet()
  }

  // If offline
  if (!status.isOnline) {
    return (
      <button
        type="button"
        className="sync-status-badge offline animate-pop"
        onClick={handleClick}
        title={t('Offline — changes saved locally')}
        aria-label={t('Offline mode')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--orange, #f97316) 18%, var(--surface-2))',
          border: '1px solid var(--orange, #f97316)',
          color: 'var(--orange, #f97316)',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Icon name="cloudOff" size={12} />
        <span>{t('Offline')}</span>
      </button>
    )
  }

  // If currently syncing
  if (status.isSyncing) {
    return (
      <button
        type="button"
        className="sync-status-badge syncing"
        onClick={handleClick}
        title={t('Syncing changes…')}
        aria-label={t('Syncing')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--blue, #3b82f6) 18%, var(--surface-2))',
          border: '1px solid var(--blue, #3b82f6)',
          color: 'var(--blue, #3b82f6)',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Icon name="arrowRotate" size={12} className="spin" />
        <span>{t('Syncing…')}</span>
      </button>
    )
  }

  // If there are pending items queued
  if (status.pendingCount > 0) {
    return (
      <button
        type="button"
        className="sync-status-badge pending animate-pop"
        onClick={handleClick}
        title={t('Offline background queue — tap to sync')}
        aria-label={t('Pending sync')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--amber, #eab308) 18%, var(--surface-2))',
          border: '1px solid var(--amber, #eab308)',
          color: 'var(--amber, #eab308)',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Icon name="cloud" size={12} />
        <span>{t('Sync ({0})', status.pendingCount)}</span>
      </button>
    )
  }

  if (showWhenSynced) {
    return (
      <button
        type="button"
        className="sync-status-badge synced"
        onClick={handleClick}
        title={t('All changes synced')}
        aria-label={t('Synced')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: 12,
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--label-2)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Icon name="check" size={11} style={{ color: 'var(--green)' }} />
        <span>{t('Synced')}</span>
      </button>
    )
  }

  return null
}
