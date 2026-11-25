import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { MEASURE_KEYS, measureSeriesFor, measureDeltaFor } from '../lib/gymmane-measures.js'
import { todayISO, fmtDate, uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Rise, RulerPicker, CollapsedHeader } from '../components/GymManeMotion.jsx'
import Icon from '../components/Icon.jsx'

function MiniSparkline({ values = [], color = 'var(--acc)' }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(0.1, max - min)
  const W = 96
  const H = 34
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 8) + 4
    const y = H - 5 - ((v - min) / span) * (H - 10)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const [lx, ly] = pts.split(' ').at(-1).split(',')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.4" fill="var(--surface)" stroke={color} strokeWidth="2" />
    </svg>
  )
}

function LogMeasureSheet({ meta, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const series = measureSeriesFor(S.measures || [], meta.key)
  const latest = series.at(-1)
  const [val, setVal] = useState(latest ? Number(latest.val) : meta.def)
  const [val2, setVal2] = useState(latest?.val2 != null ? Number(latest.val2) : meta.def)
  const [sideTab, setSideTab] = useState('left')

  const save = () => {
    const entry = {
      id: uid(),
      key: meta.key,
      val: Math.round(val * 10) / 10,
      ...(meta.sided ? { val2: Math.round(val2 * 10) / 10 } : {}),
      d: todayISO(),
      t: Date.now(),
    }
    update(s => { s.measures = [...(s.measures || []), entry] })
    useUI.getState().toast(t('{0} logged', meta.name), { icon: 'ruler', accent: 'var(--gm-sage)' })
    close()
  }

  const removeEntry = id => {
    update(s => { s.measures = (s.measures || []).filter(x => x.id !== id) })
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <h2 style={{ fontSize: 21, fontWeight: 900, marginBottom: 4 }}>{t(meta.name)}</h2>
      <div className="dim small" style={{ marginBottom: 14 }}>{t('Slide ruler to pick measurement')}</div>

      {meta.sided && (
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', padding: 4, borderRadius: 999, marginBottom: 14 }}>
          {['left', 'right'].map(side => (
            <button
              key={side}
              type="button"
              onClick={() => setSideTab(side)}
              style={{
                flex: 1, height: 34, borderRadius: 999, fontSize: 13, fontWeight: 800,
                background: sideTab === side ? 'var(--ember)' : 'transparent',
                color: sideTab === side ? 'var(--on-ember)' : 'var(--label-2)',
              }}
            >
              {side === 'left' ? `${t('Left')}: ${val} ${meta.unit}` : `${t('Right')}: ${val2} ${meta.unit}`}
            </button>
          ))}
        </div>
      )}

      <RulerPicker
        value={meta.sided && sideTab === 'right' ? val2 : val}
        min={meta.min}
        max={meta.max}
        step={0.5}
        unit={meta.unit}
        majorEvery={2}
        onChange={v => (meta.sided && sideTab === 'right' ? setVal2(v) : setVal(v))}
      />

      <button type="button" className="btn primary" style={{ marginTop: 18, minHeight: 50 }} onClick={save}>
        {t('Save measurement')}
      </button>

      {series.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="gm-micro" style={{ marginBottom: 8 }}>{t('HISTORY ({0})', series.length)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {series.slice().reverse().map(m => (
              <div key={m.id} className="row between" style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--surface-2)' }}>
                <span className="muted small" style={{ fontWeight: 700 }}>{fmtDate(m.d, true)}</span>
                <div className="row" style={{ gap: 10 }}>
                  <strong style={{ fontSize: 14 }}>
                    {m.val}{m.val2 != null ? ` / ${m.val2}` : ''} {meta.unit}
                  </strong>
                  <button type="button" style={{ color: 'var(--gm-danger)', fontSize: 14 }} onClick={() => removeEntry(m.id)}>
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Measures() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const measures = S.measures || []
  const customKeys = S.customMeasures || []
  const allKeys = [...MEASURE_KEYS, ...customKeys]
  const every = S.measureEveryDays || 0

  const openLog = meta => {
    useUI.getState().openSheet(close => <LogMeasureSheet meta={meta} close={close} />)
  }

  const openNewCustom = () => {
    useUI.getState().openSheet(close => {
      let nameVal = ''
      let unitVal = 'cm'
      return (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>{t('New Measurement')}</h2>
          <input className="input" placeholder={t('Name (e.g. Wrist, Ankle)')} onChange={e => { nameVal = e.target.value }} style={{ marginBottom: 10 }} />
          <input className="input" defaultValue="cm" placeholder={t('Unit (cm, in, %)')} onChange={e => { unitVal = e.target.value }} style={{ marginBottom: 16 }} />
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (!nameVal.trim()) return
              update(s => {
                s.customMeasures = [...(s.customMeasures || []), {
                  key: 'custom_' + uid(),
                  name: nameVal.trim(),
                  unit: unitVal.trim() || 'cm',
                  min: 1,
                  max: 200,
                  def: 30,
                }]
              })
              close()
            }}
          >
            {t('Add measurement')}
          </button>
        </div>
      )
    })
  }

  return (
    <div className="narrow">
      <CollapsedHeader title={t('Measures')} />
      <div className="hdr" style={{ alignItems: 'center' }}>
        <button type="button" className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, marginLeft: 10 }}>
          <h1 style={{ fontSize: 26 }}>{t('Body Measures')}</h1>
          <div className="sub">{t('{0} entries logged', measures.length)}</div>
        </div>
      </div>

      {/* Reminder Interval Strip */}
      <Rise index={0}>
        <div className="gm-micro" style={{ marginBottom: 8 }}>{t('REMINDER INTERVAL · DAYS')}</div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 999, marginBottom: 18 }}>
          {[0, 7, 14, 30].map(days => (
            <button
              key={days}
              type="button"
              onClick={() => update(s => { s.measureEveryDays = days })}
              style={{
                flex: 1, height: 36, borderRadius: 999, fontSize: 13, fontWeight: 800,
                background: every === days ? 'var(--ember)' : 'transparent',
                color: every === days ? 'var(--on-ember)' : 'var(--label-2)',
              }}
            >
              {days === 0 ? t('Off') : `${days}d`}
            </button>
          ))}
        </div>
      </Rise>

      {/* 10 Body Measurement Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allKeys.map((meta, idx) => {
          const series = measureSeriesFor(measures, meta.key)
          const latest = series.at(-1)
          const delta = measureDeltaFor(measures, meta.key)
          return (
            <Rise key={meta.key} index={Math.min(idx + 1, 7)}>
              <div
                className="card tappable"
                style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                onClick={() => openLog(meta)}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="gm-micro" style={{ fontSize: 11 }}>{t(meta.name)}</div>
                  {latest ? (
                    <div className="row" style={{ gap: 6, alignItems: 'baseline', marginTop: 6 }}>
                      <strong style={{ fontSize: 24, fontWeight: 900 }}>
                        {latest.val}{latest.val2 != null ? ` / ${latest.val2}` : ''}
                      </strong>
                      <span className="muted small" style={{ fontWeight: 700 }}>{meta.unit}</span>
                      {delta !== null && delta !== 0 && (
                        <span style={{ fontSize: 12, fontWeight: 800, color: delta > 0 ? 'var(--gm-sage)' : 'var(--acc)' }}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="dim small" style={{ marginTop: 6 }}>{t('Tap to log')}</div>
                  )}
                </div>
                {series.length > 1 ? (
                  <MiniSparkline values={series.map(x => Number(x.val) || 0)} />
                ) : (
                  <Icon name="plus" style={{ color: 'var(--label-3)', fontSize: 18 }} />
                )}
              </div>
            </Rise>
          )
        })}
      </div>

      <button type="button" className="btn" style={{ marginTop: 14 }} onClick={openNewCustom}>
        <Icon name="plus" /> {t('Add custom measurement')}
      </button>
    </div>
  )
}
