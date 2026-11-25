import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { uid } from '../lib/format.js'
import { beep, vibrate } from '../lib/sound.js'
import { t } from '../lib/i18n.js'
import { RollingText } from './GymManeMotion.jsx'
import Icon from './Icon.jsx'

const fmtClock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function totalCircuitSec(c) {
  const stepSum = (c.steps || []).reduce((a, st) => a + (st.workSec || 30) + (st.restSec || 15), 0)
  return stepSum * Math.max(1, c.rounds || 1) + Math.max(0, (c.rounds || 1) - 1) * (c.restBetweenRounds || 0)
}

export function openCircuitEditor(circuit = null) {
  useUI.getState().openSheet(close => <CircuitEditorBody initial={circuit} close={close} />)
}

export function openCircuitPlayer(circuit) {
  useUI.getState().openSheet(close => <CircuitPlayerBody circuit={circuit} close={close} />, { locked: true })
}

function CircuitEditorBody({ initial, close }) {
  const update = useStore(s => s.update)
  const [name, setName] = useState(initial?.name || 'HIIT Finisher')
  const [rounds, setRounds] = useState(initial?.rounds || 3)
  const [roundRest, setRoundRest] = useState(initial?.restBetweenRounds ?? 45)
  const [steps, setSteps] = useState(
    initial?.steps?.length
      ? initial.steps
      : [
          { id: uid(), name: 'Burpees', workSec: 40, restSec: 20 },
          { id: uid(), name: 'Mountain Climbers', workSec: 40, restSec: 20 },
          { id: uid(), name: 'Plank Hold', workSec: 40, restSec: 20 },
        ]
  )

  const addStep = () => setSteps(s => [...s, { id: uid(), name: '', workSec: 30, restSec: 15 }])
  const patchStep = (idx, patch) => setSteps(s => s.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
  const removeStep = idx => setSteps(s => s.filter((_, i) => i !== idx))

  const save = () => {
    const clean = steps.filter(s => s.name.trim())
    if (!clean.length) {
      useUI.getState().toast(t('Add at least one circuit step'), { icon: 'warning', accent: 'var(--gm-warn)' })
      return
    }
    const obj = {
      id: initial?.id || uid(),
      name: name.trim() || t('Circuit'),
      rounds: Math.max(1, Number(rounds) || 1),
      restBetweenRounds: Math.max(0, Number(roundRest) || 0),
      steps: clean,
    }
    update(s => {
      s.circuits = s.circuits || []
      const idx = s.circuits.findIndex(x => x.id === obj.id)
      if (idx >= 0) s.circuits[idx] = obj
      else s.circuits.push(obj)
    })
    useUI.getState().toast(t('Circuit saved'), { icon: 'checkCircle', accent: 'var(--gm-sage)' })
    close()
  }

  const del = () => {
    if (!initial?.id) return
    update(s => { s.circuits = (s.circuits || []).filter(x => x.id !== initial.id) })
    close()
  }

  return (
    <div style={{ paddingBottom: 10 }}>
      <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 14 }}>
        {initial ? t('Edit Circuit') : t('New Circuit')}
      </h2>

      <div className="gm-micro" style={{ marginBottom: 6 }}>{t('CIRCUIT NAME')}</div>
      <input
        className="input"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={t('e.g. Tabata Core')}
        style={{ marginBottom: 14 }}
      />

      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ margin: 0, padding: 12 }}>
          <div className="gm-micro" style={{ fontSize: 10 }}>{t('ROUNDS')}</div>
          <div className="row between" style={{ marginTop: 8 }}>
            <button type="button" className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => setRounds(r => Math.max(1, r - 1))}><Icon name="minus" /></button>
            <strong style={{ fontSize: 19 }}>{rounds}</strong>
            <button type="button" className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => setRounds(r => Math.min(20, r + 1))}><Icon name="plus" /></button>
          </div>
        </div>
        <div className="card" style={{ margin: 0, padding: 12 }}>
          <div className="gm-micro" style={{ fontSize: 10 }}>{t('ROUND REST')}</div>
          <div className="row between" style={{ marginTop: 8 }}>
            <button type="button" className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => setRoundRest(r => Math.max(0, r - 15))}><Icon name="minus" /></button>
            <strong style={{ fontSize: 17 }}>{roundRest}s</strong>
            <button type="button" className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => setRoundRest(r => Math.min(300, r + 15))}><Icon name="plus" /></button>
          </div>
        </div>
      </div>

      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="gm-micro">{t('EXERCISES ({0})', steps.length)}</span>
        <span className="dim small" style={{ fontWeight: 700 }}>{t('Total ~{0}', fmtClock(totalCircuitSec({ rounds, restBetweenRounds: roundRest, steps })))}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {steps.map((st, idx) => (
          <div key={st.id} style={{ background: 'var(--surface-2)', borderRadius: 16, padding: 12 }}>
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <input
                className="input"
                style={{ flex: 1, padding: '8px 12px', fontSize: 14 }}
                placeholder={t('Exercise name')}
                value={st.name}
                onChange={e => patchStep(idx, { name: e.target.value })}
              />
              {steps.length > 1 && (
                <button type="button" className="iconbtn" style={{ width: 34, height: 34, color: 'var(--gm-danger)' }} onClick={() => removeStep(idx)}>
                  <Icon name="trash" />
                </button>
              )}
            </div>
            <div className="row" style={{ gap: 10 }}>
              <label style={{ flex: 1, fontSize: 12, color: 'var(--label-2)', fontWeight: 700 }}>
                {t('Work (s)')}
                <input
                  type="number"
                  className="input"
                  style={{ marginTop: 4, padding: '6px 10px', fontSize: 14 }}
                  value={st.workSec}
                  min={5}
                  max={600}
                  onChange={e => patchStep(idx, { workSec: Math.max(5, Number(e.target.value) || 30) })}
                />
              </label>
              <label style={{ flex: 1, fontSize: 12, color: 'var(--label-2)', fontWeight: 700 }}>
                {t('Rest (s)')}
                <input
                  type="number"
                  className="input"
                  style={{ marginTop: 4, padding: '6px 10px', fontSize: 14 }}
                  value={st.restSec}
                  min={0}
                  max={300}
                  onChange={e => patchStep(idx, { restSec: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="btn" style={{ marginBottom: 10 }} onClick={addStep}>
        <Icon name="plus" /> {t('Add step')}
      </button>
      <div className="row" style={{ gap: 8 }}>
        {initial && (
          <button type="button" className="btn danger" style={{ flex: 1 }} onClick={del}>
            {t('Delete')}
          </button>
        )}
        <button type="button" className="btn primary" style={{ flex: 2 }} onClick={save}>
          {t('Save circuit')}
        </button>
      </div>
    </div>
  )
}

function CircuitPlayerBody({ circuit, close }) {
  const sound = useStore(s => s.S.sound)
  // Build flat queue of phases
  const queue = useRef([])
  if (!queue.current.length) {
    const q = []
    for (let r = 1; r <= (circuit.rounds || 1); r++) {
      for (let i = 0; i < (circuit.steps || []).length; i++) {
        const st = circuit.steps[i]
        q.push({ type: 'work', name: st.name, sec: st.workSec || 30, round: r, step: i + 1 })
        if ((st.restSec || 0) > 0 && !(r === circuit.rounds && i === circuit.steps.length - 1)) {
          q.push({ type: 'rest', name: t('Rest'), sec: st.restSec, round: r, step: i + 1 })
        }
      }
      if (r < (circuit.rounds || 1) && (circuit.restBetweenRounds || 0) > 0) {
        q.push({ type: 'roundRest', name: t('Round Rest'), sec: circuit.restBetweenRounds, round: r, step: circuit.steps.length })
      }
    }
    queue.current = q
  }

  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(queue.current[0]?.sec || 30)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)

  const cur = queue.current[idx]
  const next = queue.current[idx + 1]

  useEffect(() => {
    if (paused || done || !cur) return
    const iv = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          beep(sound, cur.type === 'work' ? 520 : 980, 0.22)
          vibrate([120, 60, 120])
          if (idx + 1 >= queue.current.length) {
            setDone(true)
            return 0
          }
          const nxt = queue.current[idx + 1]
          setIdx(i => i + 1)
          return nxt.sec
        }
        if (prev <= 4) beep(sound, 660, 0.08)
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [paused, done, idx, cur, sound])

  const skip = () => {
    if (idx + 1 >= queue.current.length) {
      setDone(true)
    } else {
      const nxt = queue.current[idx + 1]
      setIdx(idx + 1)
      setLeft(nxt.sec)
    }
  }

  const accent = cur?.type === 'work' ? 'var(--acc)' : 'var(--gm-sage)'
  const frac = cur ? left / Math.max(1, cur.sec) : 0
  const r = 74
  const circ = 2 * Math.PI * r

  return (
    <div style={{ textAlign: 'center', paddingBottom: 12 }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'left' }}>
          <div className="gm-micro">{circuit.name}</div>
          {!done && cur && (
            <div className="muted small" style={{ fontWeight: 700, marginTop: 2 }}>
              {t('Round {0}/{1}', cur.round, circuit.rounds)}
            </div>
          )}
        </div>
        <button type="button" className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      {done ? (
        <div style={{ padding: '26px 8px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gm-sage-soft)', color: 'var(--gm-sage)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
            <Icon name="check" />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>{t('Circuit Complete!')}</h2>
          <div className="muted small" style={{ marginBottom: 22 }}>
            {t('{0} rounds · {1}', circuit.rounds, fmtClock(totalCircuitSec(circuit)))}
          </div>
          <button type="button" className="btn primary" onClick={close}>{t('Done')}</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', width: 184, height: 184, margin: '8px auto 16px' }}>
            <svg width="184" height="184" viewBox="0 0 184 184">
              <circle cx="92" cy="92" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
              <circle
                cx="92" cy="92" r={r} fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} transform="rotate(-90 92 92)"
                style={{ transition: 'stroke-dashoffset 350ms linear, stroke 300ms' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="gm-micro" style={{ color: accent, marginBottom: 4 }}>
                {cur?.type === 'work' ? t('WORK') : t('REST')}
              </div>
              <RollingText value={fmtClock(left)} countsDown={true} style={{ fontSize: 42, fontWeight: 900 }} />
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>{cur?.name}</h2>
          {next && (
            <div className="dim small" style={{ marginBottom: 22, fontWeight: 700 }}>
              {t('Up next: {0} ({1}s)', next.name, next.sec)}
            </div>
          )}

          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setPaused(p => !p)}>
              <Icon name={paused ? 'playFill' : 'pause'} /> {paused ? t('Resume') : t('Pause')}
            </button>
            <button type="button" className="btn primary" style={{ flex: 1 }} onClick={skip}>
              {t('Next')} <Icon name="chevronRight" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function CircuitSection() {
  const circuits = useStore(s => s.S?.circuits || [])
  return (
    <div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="gm-micro">{t('CIRCUITS & HIIT')}</span>
        <button type="button" className="gm-see-all" onClick={() => openCircuitEditor(null)}>
          <Icon name="plus" style={{ fontSize: 13 }} /> {t('New circuit')}
        </button>
      </div>
      {!circuits.length ? (
        <div
          className="card tappable"
          style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
          onClick={() => openCircuitEditor(null)}
        >
          <span style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--surface-2)', color: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            <Icon name="timer" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{t('Create a HIIT circuit')}</div>
            <div className="muted small">{t('Timed intervals, Tabata, EMOM or conditioning finishers')}</div>
          </div>
          <Icon name="plus" style={{ color: 'var(--label-3)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {circuits.map(c => (
            <div
              key={c.id}
              className="card tappable"
              style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => openCircuitEditor(c)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{c.name}</div>
                <div className="muted small" style={{ marginTop: 2, fontWeight: 600 }}>
                  {t('{0} steps · {1} rounds · {2}', c.steps.length, c.rounds, fmtClock(totalCircuitSec(c)))}
                </div>
                <div className="dim small" style={{ fontSize: 11.5, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.steps.map(x => x.name).join(' · ')}
                </div>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); openCircuitPlayer(c) }}
                aria-label={t('Start circuit')}
                style={{
                  width: 44, height: 44, borderRadius: '50%', background: 'var(--ember)', color: 'var(--on-ember)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                }}
              >
                <Icon name="playFill" style={{ fontSize: 16, marginLeft: 2 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
