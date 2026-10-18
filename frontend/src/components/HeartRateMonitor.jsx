import { useState, useEffect } from 'react'
import { bleHeartRate, HR_ZONES, getHeartRateZone } from '../lib/ble-heartrate.js'
import { t } from '../lib/i18n.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'

export function HeartRateSheet({ close }) {
  const [bleState, setBleState] = useState(() => bleHeartRate.getState())
  const [maxHrInput, setMaxHrInput] = useState(() => bleHeartRate.maxHr)

  useEffect(() => {
    return bleHeartRate.subscribe(setBleState)
  }, [])

  const handleConnect = async () => {
    await bleHeartRate.connect()
  }

  const handleDisconnect = async () => {
    await bleHeartRate.disconnect()
  }

  const handleMaxHrChange = e => {
    const v = parseInt(e.target.value, 10)
    setMaxHrInput(e.target.value)
    if (v >= 100 && v <= 240) {
      bleHeartRate.setMaxHr(v)
    }
  }

  const isConnected = bleState.status === 'connected'
  const isConnecting = bleState.status === 'connecting'
  const currentZone = bleState.zone || HR_ZONES.REST

  return (
    <div className="sheet-content hr-modal-content" style={{ padding: '16px 20px 28px' }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 16,
            background: isConnected ? 'color-mix(in srgb, var(--red) 15%, transparent)' : 'var(--surface-2)',
            color: isConnected ? 'var(--red)' : 'var(--label-2)'
          }}>
            <Icon name="heart" />
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t('Heart Rate Monitor')}</div>
            <div style={{ fontSize: 12, color: 'var(--label-2)' }}>
              {isConnected
                ? (bleState.deviceName || t('Connected'))
                : isConnecting
                  ? t('Connecting...')
                  : t('Wearable BLE / Smartwatch')}
            </div>
          </div>
        </div>
        <button className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      {bleState.error && (
        <div className="card" style={{
          background: 'color-mix(in srgb, var(--red) 12%, transparent)',
          borderColor: 'var(--red)',
          color: 'var(--red)',
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 600 }}>{t('Connection Error')}</div>
          <div>{t(bleState.error)}</div>
        </div>
      )}

      {/* Live Measurement Card */}
      <div className="card" style={{
        textAlign: 'center',
        padding: '20px 16px',
        marginBottom: 16,
        background: 'var(--surface-2)',
        borderRadius: 14
      }}>
        {isConnected && bleState.bpm ? (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 6,
              justifyContent: 'center',
              marginBottom: 8
            }}>
              <span className="live-workout-pulse" style={{
                background: currentZone.color,
                boxShadow: `0 0 10px ${currentZone.color}`,
                width: 12,
                height: 12
              }} />
              <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
                {bleState.bpm}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--label-2)' }}>
                {t('BPM')}
              </span>
            </div>

            <div style={{ marginTop: 8 }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                background: currentZone.color,
                boxShadow: `0 2px 8px color-mix(in srgb, ${currentZone.color} 30%, transparent)`
              }}>
                {t(currentZone.name)} ({currentZone.pct}%)
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 0', color: 'var(--label-2)' }}>
            <Icon name="heart" size={36} style={{ color: 'var(--label-3)', marginBottom: 8 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {isConnecting ? t('Connecting to sensor…') : t('No Heart Rate Sensor Connected')}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {t('Connect a Bluetooth chest strap or broadcast from your smartwatch.')}
            </div>
          </div>
        )}

        {/* 5-Zone Gauge Breakdown */}
        <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--label-2)', marginBottom: 8 }}>
            {t('Heart Rate Zones')}
          </div>
          <div style={{ display: 'flex', gap: 4, height: 10, borderRadius: 5, overflow: 'hidden' }}>
            {Object.values(HR_ZONES).filter(z => z.zone > 0).map(z => {
              const isActive = isConnected && currentZone.zone === z.zone
              return (
                <div
                  key={z.zone}
                  style={{
                    flex: 1,
                    background: z.color,
                    opacity: isConnected ? (isActive ? 1 : 0.35) : 0.6,
                    transform: isActive ? 'scaleY(1.3)' : 'scaleY(1)',
                    transition: 'all 0.2s ease',
                    borderRadius: 2
                  }}
                  title={`${z.name} (${z.minPct}-${z.maxPct}%)`}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--label-3)', marginTop: 6 }}>
            <span>{t('Warmup')}</span>
            <span>{t('Fat Burn')}</span>
            <span>{t('Aerobic')}</span>
            <span>{t('Anaerobic')}</span>
            <span>{t('Max/Peak')}</span>
          </div>
        </div>
      </div>

      {/* Connect / Disconnect Buttons */}
      <div style={{ marginBottom: 16 }}>
        {isConnected ? (
          <button
            type="button"
            className="btn full danger"
            onClick={handleDisconnect}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Icon name="bluetooth" />
            <span>{t('Disconnect Sensor')}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn full primary"
            disabled={isConnecting}
            onClick={handleConnect}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Icon name="bluetooth" />
            <span>{isConnecting ? t('Searching for sensor…') : t('Pair Bluetooth Heart Rate Sensor')}</span>
          </button>
        )}
      </div>

      {/* Max HR Setting */}
      <div className="card row between" style={{ padding: '10px 14px', marginBottom: 16, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t('Max Heart Rate (BPM)')}</div>
          <div style={{ fontSize: 11, color: 'var(--label-2)' }}>{t('Used to calculate your 5 training zones')}</div>
        </div>
        <input
          type="number"
          min="100"
          max="240"
          value={maxHrInput}
          onChange={handleMaxHrChange}
          style={{
            width: 70,
            padding: '6px 8px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700
          }}
        />
      </div>

      {/* Apple Watch & Wear OS Companion Guide */}
      <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="info" size={14} />
          <span>{t('Apple Watch / Wear OS Companion')}</span>
        </div>
        <p style={{ margin: '4px 0', color: 'var(--label-2)', lineHeight: 1.4 }}>
          {t('To connect an Apple Watch, use a BLE heart rate broadcast companion app (like HeartCast or Blueheart). Wear OS smartwatches can broadcast HR directly via BLE in Workout settings. Any standard BLE chest strap (Polar, Garmin, Wahoo) pairs natively via Web Bluetooth.')}
        </p>
      </div>
    </div>
  )
}

export function openHeartRateSheet() {
  useUI.getState().openSheet(close => <HeartRateSheet close={close} />)
}

/**
 * Live Heart Rate Badge rendered in the active workout header.
 */
export function HeartRateBadge({ onClick }) {
  const [bleState, setBleState] = useState(() => bleHeartRate.getState())

  useEffect(() => {
    return bleHeartRate.subscribe(setBleState)
  }, [])

  const handleClick = () => {
    if (onClick) onClick()
    else openHeartRateSheet()
  }

  const isConnected = bleState.status === 'connected'
  const isConnecting = bleState.status === 'connecting'
  const bpm = bleState.bpm
  const zone = bleState.zone || HR_ZONES.REST

  if (isConnected && bpm) {
    return (
      <button
        type="button"
        className="hr-live-badge active animate-pop"
        onClick={handleClick}
        title={`${bpm} BPM - ${t(zone.name)}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 8px',
          borderRadius: 14,
          background: 'var(--surface-2)',
          border: `1px solid color-mix(in srgb, ${zone.color} 50%, var(--border))`,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--label)',
        }}
      >
        <span style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center' }}>
          <Icon name="heart" size={13} />
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
          {bpm}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 5px',
            borderRadius: 6,
            background: zone.color,
            color: '#fff',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.3
          }}
        >
          {t(zone.name)}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={'hr-live-badge' + (isConnecting ? ' connecting' : '')}
      onClick={handleClick}
      title={t('Heart Rate Sensor')}
      aria-label={t('Heart Rate Sensor')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 14,
        background: 'transparent',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        fontSize: 11,
        color: 'var(--label-2)',
      }}
    >
      <Icon name="heart" size={13} style={{ color: isConnecting ? 'var(--blue)' : 'var(--label-3)' }} />
      <span>{isConnecting ? t('Connecting…') : t('HR')}</span>
    </button>
  )
}
