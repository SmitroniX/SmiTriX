import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { CollapsedHeader, Rise, RollingText } from '../components/GymManeMotion.jsx'
import { fmtDate, todayISO, uid } from '../lib/format.js'
import { beep } from '../lib/sound.js'
import { t } from '../lib/i18n.js'
import { RECOVERY_KINDS, BREATH_PATTERNS, summarizeRecoveryWeek } from '../lib/gymmane-recovery.js'

function fmtMS(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function RecoveryGoalsSheet({ heatGoalMin, coldGoalMin, close }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const [heat, setHeat] = useState(heatGoalMin)
  const [cold, setCold] = useState(coldGoalMin)

  const save = () => {
    update(s => {
      s.recovery = s.recovery || { entries: [] }
      s.recovery.heatGoalMin = Math.max(5, Number(heat) || 45)
      s.recovery.coldGoalMin = Math.max(1, Number(cold) || 11)
    })
    toast(t('Weekly recovery goals updated'))
    close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>{t('Weekly Recovery Goals')}</h3>
      <div className="muted small">{t('Protocol benchmark: 45–57 min/week sauna heat & 11 min/week deliberate cold.')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="small muted">
          {t('Heat goal (min/wk)')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={heat} onChange={e => setHeat(e.target.value)} />
        </label>
        <label className="small muted">
          {t('Cold goal (min/wk)')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={cold} onChange={e => setCold(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn primary" onClick={save}>{t('Save goals')}</button>
    </div>
  )
}

function ThermalTimerSheet({ kindObj, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const isContrast = kindObj.id === 'contrast'
  const [running, setRunning] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [manualMin, setManualMin] = useState(kindObj.defaultMin || 15)
  const [coldMin, setColdMin] = useState(kindObj.defaultColdMin || 2)
  const [rounds, setRounds] = useState(isContrast ? 3 : 1)
  const [tempC, setTempC] = useState(kindObj.defaultTempC ?? (kindObj.id === 'cold' ? 10 : 85))
  const [feel, setFeel] = useState(4)

  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => setElapsedSec(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [running])

  const logSession = () => {
    const sec = elapsedSec >= 10 ? elapsedSec : Math.max(60, Math.round((Number(manualMin) || 10) * 60))
    const entry = {
      id: uid(),
      kind: kindObj.id,
      d: todayISO(),
      sec,
      coldSec: isContrast ? Math.max(30, Math.round((Number(coldMin) || 2) * 60)) : 0,
      rounds: isContrast ? Math.max(1, Number(rounds) || 1) : 1,
      tempC: Number(tempC) || null,
      feel,
      t: Date.now(),
    }
    update(s => {
      s.recovery = s.recovery || { entries: [], heatGoalMin: 45, coldGoalMin: 11 }
      s.recovery.entries = [entry, ...(s.recovery.entries || [])]
    })
    beep(S.sound, 880, 0.14)
    toast(t('{0} session logged', kindObj.name))
    close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row" style={{ gap: 12 }}>
        <img src={kindObj.img} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <div>
          <h3 style={{ margin: 0 }}>{t(kindObj.name)}</h3>
          <div className="dim small">{t(kindObj.desc)}</div>
        </div>
      </div>

      {/* Live Stopwatch */}
      <div className="card" style={{ margin: 0, textAlign: 'center', padding: '18px 14px' }}>
        <div className="gm-micro" style={{ color: kindObj.color }}>{running ? t('SESSION LIVE') : t('LIVE TIMER')}</div>
        <RollingText value={fmtMS(elapsedSec)} style={{ fontSize: 44, fontWeight: 900, marginTop: 6 }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 12 }}>
          <button
            type="button"
            className="btn primary"
            style={{ width: 'auto', padding: '10px 22px', background: kindObj.color, color: '#111' }}
            onClick={() => setRunning(r => !r)}
          >
            <Icon name={running ? 'pause' : 'playFill'} style={{ fontSize: 13 }} /> {running ? t('Pause') : t('Start timer')}
          </button>
          {elapsedSec > 0 && (
            <button type="button" className="btn ghost" style={{ width: 'auto' }} onClick={() => { setRunning(false); setElapsedSec(0) }}>
              {t('Reset')}
            </button>
          )}
        </div>
      </div>

      {/* Manual parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: isContrast ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
        <label className="small muted">
          {isContrast ? t('Heat / rd (min)') : t('Minutes')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={manualMin} onChange={e => setManualMin(e.target.value)} />
        </label>
        {isContrast ? (
          <>
            <label className="small muted">
              {t('Cold / rd (min)')}
              <input type="number" className="input" style={{ marginTop: 4 }} value={coldMin} onChange={e => setColdMin(e.target.value)} />
            </label>
            <label className="small muted">
              {t('Rounds')}
              <input type="number" className="input" style={{ marginTop: 4 }} value={rounds} onChange={e => setRounds(e.target.value)} />
            </label>
          </>
        ) : (
          <label className="small muted">
            {t('Temp (°C)')}
            <input type="number" className="input" style={{ marginTop: 4 }} value={tempC} onChange={e => setTempC(e.target.value)} />
          </label>
        )}
      </div>

      <div>
        <div className="gm-micro" style={{ fontSize: 10, marginBottom: 6 }}>{t('HOW DID YOU FEEL?')}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setFeel(n)}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 12,
                fontWeight: 800,
                background: feel === n ? kindObj.color : 'var(--surface-2)',
                color: feel === n ? '#111' : 'var(--label-2)',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn primary" onClick={logSession}>
        {t('Log {0} Session', kindObj.name)}
      </button>
    </div>
  )
}

function BreathingPlayerSheet({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [patternId, setPatternId] = useState(BREATH_PATTERNS[0].id)
  const [running, setRunning] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [phaseLeft, setPhaseLeft] = useState(BREATH_PATTERNS[0].phases[0].sec)
  const [cycles, setCycles] = useState(0)
  const [totalSec, setTotalSec] = useState(0)

  const pattern = useMemo(() => BREATH_PATTERNS.find(p => p.id === patternId) || BREATH_PATTERNS[0], [patternId])
  const currentPhase = pattern.phases[phaseIdx] || pattern.phases[0]

  useEffect(() => {
    setRunning(false)
    setPhaseIdx(0)
    setPhaseLeft(pattern.phases[0].sec)
  }, [patternId])

  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => {
      setTotalSec(s => s + 1)
      setPhaseLeft(prev => {
        if (prev > 1) return prev - 1
        setPhaseIdx(pi => {
          const next = (pi + 1) % pattern.phases.length
          if (next === 0) setCycles(c => c + 1)
          beep(S.sound, next === 0 ? 660 : 480, 0.08)
          return next
        })
        const nextIdx = (phaseIdx + 1) % pattern.phases.length
        return pattern.phases[nextIdx].sec
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [running, pattern, phaseIdx, S.sound])

  const saveBreath = () => {
    const loggedSec = Math.max(30, totalSec || 180)
    update(s => {
      s.recovery = s.recovery || { entries: [], heatGoalMin: 45, coldGoalMin: 11 }
      s.recovery.entries = [
        {
          id: uid(),
          kind: 'breath',
          pattern: pattern.name,
          cycles,
          d: todayISO(),
          sec: loggedSec,
          bestHold: pattern.phases.reduce((mx, p) => (p.label === 'Hold' ? Math.max(mx, p.sec) : mx), 0),
          t: Date.now(),
        },
        ...(s.recovery.entries || []),
      ]
    })
    toast(t('Breathwork session saved'))
    close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div style={{ width: '100%' }}>
        <h3 style={{ margin: 0 }}>{t('Guided Breathwork')}</h3>
        <div className="dim small">{t(pattern.desc)}</div>
      </div>

      <div className="chips" style={{ width: '100%' }}>
        {BREATH_PATTERNS.map(p => (
          <button
            key={p.id}
            type="button"
            className={'chip' + (patternId === p.id ? ' on' : '')}
            onClick={() => setPatternId(p.id)}
          >
            {t(p.name)}
          </button>
        ))}
      </div>

      {/* Animated Breathing Orb */}
      <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="gm-breath-orb"
          style={{
            transform: `scale(${running ? currentPhase.scale : 0.96})`,
            transition: `transform ${Math.max(0.8, currentPhase.sec * 0.85)}s ease-in-out`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gm-sage)' }}>
            {running ? t(currentPhase.label) : t('READY')}
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            {running ? phaseLeft : pattern.phases[0].sec}
          </div>
          <div className="dim small" style={{ marginTop: 4 }}>
            {cycles} {cycles === 1 ? t('cycle') : t('cycles')} · {fmtMS(totalSec)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button type="button" className="btn primary" style={{ flex: 1 }} onClick={() => setRunning(r => !r)}>
          <Icon name={running ? 'pause' : 'playFill'} style={{ fontSize: 13 }} /> {running ? t('Pause') : t('Begin')}
        </button>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={saveBreath}>
          {t('Finish & Log')}
        </button>
      </div>
    </div>
  )
}

export default function Recovery() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const openSheet = useUI(s => s.openSheet)

  const rec = S.recovery || { entries: [], heatGoalMin: 45, coldGoalMin: 11 }
  const heatGoalMin = rec.heatGoalMin || 45
  const coldGoalMin = rec.coldGoalMin || 11
  const summary = useMemo(() => summarizeRecoveryWeek(S), [S.recovery, S.weekStart])

  const heatMin = Math.round(summary.heat / 60)
  const coldMin = Math.round((summary.cold / 60) * 10) / 10
  const maxDaySec = Math.max(60, ...summary.weekDays)
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const openKind = kindObj => {
    if (kindObj.id === 'breath') {
      openSheet(close => <BreathingPlayerSheet close={close} />)
    } else {
      openSheet(close => <ThermalTimerSheet kindObj={kindObj} close={close} />)
    }
  }

  const removeEntry = id => {
    update(s => {
      if (!s.recovery?.entries) return
      s.recovery.entries = s.recovery.entries.filter(e => e.id !== id)
    })
  }

  return (
    <div className="narrow" style={{ paddingBottom: 44 }}>
      <CollapsedHeader title={t('Recovery')} />

      <div className="hdr" style={{ gap: 10 }}>
        <button type="button" className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1 }}>
          <h1>{t('Recovery')}</h1>
          <div className="sub">{t('Sauna, cold plunge, contrast & breathwork')}</div>
        </div>
        <button
          type="button"
          className="iconbtn"
          aria-label={t('Goals')}
          onClick={() => openSheet(close => <RecoveryGoalsSheet heatGoalMin={heatGoalMin} coldGoalMin={coldGoalMin} close={close} />)}
        >
          <Icon name="sliders" />
        </button>
      </div>

      {/* Weekly Heat & Cold Hero */}
      <Rise index={0} className="card" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <span className="gm-micro">{t('THIS WEEK')}</span>
          <span className="dim small">{summary.sessions} {summary.sessions === 1 ? t('session') : t('sessions')}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 18, padding: 14 }}>
            <div className="gm-micro" style={{ fontSize: 10, color: '#D9A184' }}>{t('HEAT EXPOSURE')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <RollingText value={heatMin} style={{ fontSize: 28, fontWeight: 900 }} />
              <span className="dim small">/ {heatGoalMin}m</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--surface)', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (heatMin / heatGoalMin) * 100)}%`, height: '100%', background: '#D9A184', borderRadius: 99 }} />
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', borderRadius: 18, padding: 14 }}>
            <div className="gm-micro" style={{ fontSize: 10, color: '#7FA8C9' }}>{t('COLD EXPOSURE')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <RollingText value={coldMin} style={{ fontSize: 28, fontWeight: 900 }} />
              <span className="dim small">/ {coldGoalMin}m</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--surface)', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (coldMin / coldGoalMin) * 100)}%`, height: '100%', background: '#7FA8C9', borderRadius: 99 }} />
            </div>
          </div>
        </div>

        {/* 7-day mini bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', height: 56 }}>
          {summary.weekDays.map((sec, i) => {
            const pct = sec > 0 ? Math.max(14, Math.round((sec / maxDaySec) * 100)) : 8
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', maxWidth: 20, height: `${pct}%`, borderRadius: 6, background: sec > 0 ? 'var(--gm-sage)' : 'var(--surface-2)' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-3)' }}>{dayLetters[i]}</span>
              </div>
            )
          })}
        </div>

        {(summary.bestColdSec > 0 || summary.bestHoldSec > 0) && (
          <div className="chips" style={{ marginTop: 14 }}>
            {summary.bestColdSec > 0 && <span className="chip">❄️ {t('Best cold')}: {fmtMS(summary.bestColdSec)}</span>}
            {summary.bestHoldSec > 0 && <span className="chip">🫁 {t('Best hold')}: {summary.bestHoldSec}s</span>}
          </div>
        )}
      </Rise>

      {/* 4 Recovery Modalities */}
      <Rise index={1} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {RECOVERY_KINDS.map(k => (
          <button
            key={k.id}
            type="button"
            className="card"
            onClick={() => openKind(k)}
            style={{
              margin: 0,
              padding: '16px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img src={k.img} alt="" style={{ height: 64, width: 64, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 15.5, color: 'var(--label)' }}>{t(k.name)}</div>
              <div className="dim small" style={{ marginTop: 2, lineHeight: 1.3 }}>{t(k.desc)}</div>
            </div>
          </button>
        ))}
      </Rise>

      {/* Mobility & Stretching Link */}
      <Rise index={2} className="card row between" style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => nav('/train?kind=warmup')}>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'color-mix(in srgb, var(--gm-sage) 18%, var(--surface-2))', color: 'var(--gm-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>
            <Icon name="figureRun" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{t('Mobility & Stretching')}</div>
            <div className="dim small">{t('Pick tight muscles on the body map for a flow')}</div>
          </div>
        </div>
        <Icon name="chevronRight" style={{ color: 'var(--label-3)' }} />
      </Rise>

      {/* Recent Recovery Sessions */}
      <Rise index={3}>
        <div className="gm-micro" style={{ marginBottom: 10 }}>{t('RECENT SESSIONS')}</div>
        {(rec.entries || []).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div className="dim small">{t('Tap Sauna, Cold Plunge, Contrast or Breathwork above to log your first session.')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(rec.entries || []).slice(0, 20).map(e => {
              const meta = RECOVERY_KINDS.find(k => k.id === e.kind) || RECOVERY_KINDS[0]
              return (
                <div key={e.id} className="card row between" style={{ margin: 0, padding: '12px 14px' }}>
                  <div className="row" style={{ gap: 10 }}>
                    <img src={meta.img} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        {t(meta.name)}
                        {e.pattern ? ` · ${e.pattern}` : ''}
                      </div>
                      <div className="dim small">
                        {fmtDate(e.d, true)} · {fmtMS(e.sec)}
                        {e.tempC ? ` · ${e.tempC}°C` : ''}
                        {e.rounds > 1 ? ` · ${e.rounds} ${t('rds')}` : ''}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="iconbtn" style={{ width: 30, height: 30, color: 'var(--label-3)' }} onClick={() => removeEntry(e.id)}>
                    <Icon name="trash" style={{ fontSize: 14 }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Rise>
    </div>
  )
}
