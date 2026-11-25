import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { CollapsedHeader, Rise, RollingText } from '../components/GymManeMotion.jsx'
import { lastBW } from '../lib/history.js'
import { todayISO, uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { activeProfile } from '../lib/equipment.js'
import {
  TOOL_META,
  calc1RM,
  calcPlates,
  calcWarmupSets,
  calcRpeLoad,
  calcDots,
  calcWilks,
  calcBmi,
  calcNavyBodyFat,
  calcFfmi,
  calcTdee,
  calcProtein,
  calcWater,
} from '../lib/gymmane-calculators.js'

const GROUP_LABELS = {
  strength: 'Strength & Lifting',
  body: 'Body Composition',
  nutrition: 'Nutrition & Hydration',
}

const PLATE_COLORS = {
  25: '#D9534F',
  45: '#4A7BD0',
  20: '#4A7BD0',
  35: '#E2B44B',
  15: '#E2B44B',
  10: '#64A86B',
  5: '#E8E4DC',
  2.5: '#8C857D',
  1.25: '#B89B7A',
  0.5: '#9FA3A8',
}

const ACTIVITY_LEVELS = [
  { v: 1.2, label: 'Sedentary', desc: 'Desk job, little exercise' },
  { v: 1.375, label: 'Light', desc: '1–3 sessions / week' },
  { v: 1.55, label: 'Moderate', desc: '3–5 sessions / week' },
  { v: 1.725, label: 'Very active', desc: '6–7 intense sessions' },
  { v: 1.9, label: 'Athlete', desc: 'Twice daily / physical job' },
]

function NumField({ label, value, onChange, step = 1, min = 0, max = 9999, unit = '' }) {
  const num = Number(value) || 0
  const nudge = d => {
    const next = Math.max(min, Math.min(max, Math.round((num + d) * 100) / 100))
    onChange(next)
  }
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '10px 12px', border: '1px solid var(--sep-op)' }}>
      <div className="gm-micro" style={{ fontSize: 10, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <button
          type="button"
          className="iconbtn"
          style={{ width: 32, height: 32, borderRadius: 10 }}
          onClick={() => nudge(-step)}
          aria-label={`decrease ${label}`}
        >
          <Icon name="minus" style={{ fontSize: 13 }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flex: 1, justifyContent: 'center' }}>
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            style={{
              width: 72,
              background: 'transparent',
              border: 'none',
              color: 'var(--label)',
              fontSize: 18,
              fontWeight: 800,
              textAlign: 'center',
              outline: 'none',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          {unit && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label-2)' }}>{unit}</span>}
        </div>
        <button
          type="button"
          className="iconbtn"
          style={{ width: 32, height: 32, borderRadius: 10 }}
          onClick={() => nudge(step)}
          aria-label={`increase ${label}`}
        >
          <Icon name="plus" style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  )
}

function SegPills({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const on = value === opt.value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              minWidth: 72,
              padding: '9px 12px',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 800,
              background: on ? 'var(--acc)' : 'var(--surface-2)',
              color: on ? 'var(--acc-ink)' : 'var(--label-2)',
              border: on ? '1px solid transparent' : '1px solid var(--sep-op)',
              cursor: 'pointer',
              transition: 'all 180ms ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function Tools() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const unit = S.unit || 'kg'
  const isLb = unit === 'lb'
  const bwEntry = lastBW(S)
  const defaultBwKg = bwEntry ? (isLb ? Math.round(bwEntry.w * 0.45359237 * 10) / 10 : bwEntry.w) : 78
  const defaultHeightCm = Number(S.athleteProfile?.height) || 176
  const defaultSex = S.body === 'female' ? 'female' : 'male'
  const activePlace = activeProfile(S)
  const ownedPlates = activePlace?.plates?.length ? activePlace.plates : null

  const activeToolId = params.get('tool') || ''
  const [groupFilter, setGroupFilter] = useState('all')

  // Shared calculator states
  const [rmW, setRmW] = useState(isLb ? 225 : 100)
  const [rmR, setRmR] = useState(5)
  const [rmPct, setRmPct] = useState(85)

  const [plateTarget, setPlateTarget] = useState(isLb ? 225 : 100)
  const [barW, setBarW] = useState(isLb ? 45 : 20)

  const [wuTarget, setWuTarget] = useState(isLb ? 225 : 100)

  const [rpeW, setRpeW] = useState(isLb ? 185 : 85)
  const [rpeReps, setRpeReps] = useState(6)
  const [rpeNow, setRpeNow] = useState(8)
  const [rpeTargetReps, setRpeTargetReps] = useState(5)
  const [rpeTargetRpe, setRpeTargetRpe] = useState(8.5)

  const [sex, setSex] = useState(defaultSex)
  const [bwKg, setBwKg] = useState(defaultBwKg)
  const [squat, setSquat] = useState(140)
  const [bench, setBench] = useState(100)
  const [deadlift, setDeadlift] = useState(180)

  const [heightCm, setHeightCm] = useState(defaultHeightCm)
  const [neckCm, setNeckCm] = useState(38)
  const [waistCm, setWaistCm] = useState(82)
  const [hipCm, setHipCm] = useState(96)
  const [bfPct, setBfPct] = useState(15)

  const [age, setAge] = useState(26)
  const [activity, setActivity] = useState(1.55)
  const [protGoal, setProtGoal] = useState('gain')
  const [trainMin, setTrainMin] = useState(60)

  const activeTool = useMemo(() => TOOL_META.find(x => x.id === activeToolId) || null, [activeToolId])

  const openTool = id => {
    const next = new URLSearchParams(params)
    if (id) next.set('tool', id)
    else next.delete('tool')
    setParams(next, { replace: false })
  }

  const saveBfToMeasures = val => {
    update(s => {
      s.measures = s.measures || []
      s.measures.push({ id: uid(), key: 'bodyfat', val, d: todayISO(), t: Date.now() })
    })
    toast(t('Saved {0}% body fat to Measures', val))
  }

  const applyNutritionGoals = patch => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.goals = { ...(s.nutrition.goals || {}), ...patch }
    })
    toast(t('Nutrition goals updated'))
  }

  const renderToolDetail = () => {
    if (!activeTool) return null

    if (activeTool.id === 'rm') {
      const res = calc1RM(rmW, rmR, rmPct)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('ESTIMATED 1RM')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
              <RollingText value={res.oneRm} style={{ fontSize: 44, fontWeight: 900 }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--label-2)' }}>{unit}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-2)', marginTop: 6 }}>
              {rmPct}% = <b style={{ color: 'var(--label)' }}>{res.atPct} {unit}</b>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField label={t('Weight')} value={rmW} onChange={setRmW} step={isLb ? 5 : 2.5} unit={unit} />
            <NumField label={t('Reps')} value={rmR} onChange={setRmR} step={1} min={1} max={30} />
          </div>

          <div className="card">
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="gm-micro">{t('TARGET PERCENTAGE')}</span>
              <span style={{ fontWeight: 800, color: 'var(--acc)' }}>{rmPct}% · {res.atPct} {unit}</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="2.5"
              value={rmPct}
              onChange={e => setRmPct(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--acc)' }}
            />
          </div>

          <div className="card">
            <div className="gm-micro" style={{ marginBottom: 10 }}>{t('TRAINING PERCENTAGES')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {res.table.map(row => (
                <div
                  key={row.pct}
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: 14,
                    padding: '10px 10px',
                    textAlign: 'center',
                    border: row.pct === Math.round(rmPct) ? '1px solid var(--acc)' : '1px solid transparent',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--acc)' }}>{row.pct}%</div>
                  <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>{row.weight} {unit}</div>
                  <div style={{ fontSize: 11, color: 'var(--label-2)', fontWeight: 600 }}>~{row.estReps} {t('reps')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (activeTool.id === 'plate') {
      const res = calcPlates(plateTarget, barW, unit, ownedPlates)
      const discs = []
      for (const item of res.perSide) {
        for (let i = 0; i < item.count; i++) discs.push(item.plate)
      }
      const barPresets = isLb ? [45, 35, 15, 0] : [20, 15, 10, 0]
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('LOADED BARBELL')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <RollingText value={res.loaded} style={{ fontSize: 40, fontWeight: 900 }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label-2)' }}>{unit}</span>
            </div>
            {res.remainder > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gm-brass)', marginTop: 4 }}>
                {t('Short by {0} {1} with available plates', res.remainder, unit)}
              </div>
            )}

            {/* Visual Barbell Preview */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 18, minHeight: 84 }}>
              <div style={{ width: 22, height: 8, borderRadius: 4, background: 'var(--label-3)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {[...discs].reverse().map((p, i) => {
                  const h = Math.max(30, Math.min(78, 28 + p * (isLb ? 1.1 : 2)))
                  return (
                    <div
                      key={'L' + i}
                      style={{
                        width: p >= 15 ? 12 : 9,
                        height: h,
                        borderRadius: 4,
                        background: PLATE_COLORS[p] || 'var(--acc)',
                        border: '1px solid rgba(0,0,0,0.35)',
                      }}
                      title={`${p} ${unit}`}
                    />
                  )
                })}
              </div>
              <div style={{ width: 68, height: 9, borderRadius: 4, background: 'linear-gradient(180deg, #b6b1a9, #6b6761)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {discs.map((p, i) => {
                  const h = Math.max(30, Math.min(78, 28 + p * (isLb ? 1.1 : 2)))
                  return (
                    <div
                      key={'R' + i}
                      style={{
                        width: p >= 15 ? 12 : 9,
                        height: h,
                        borderRadius: 4,
                        background: PLATE_COLORS[p] || 'var(--acc)',
                        border: '1px solid rgba(0,0,0,0.35)',
                      }}
                      title={`${p} ${unit}`}
                    />
                  )
                })}
              </div>
              <div style={{ width: 22, height: 8, borderRadius: 4, background: 'var(--label-3)' }} />
            </div>
          </div>

          <NumField label={t('Target Total Weight')} value={plateTarget} onChange={setPlateTarget} step={isLb ? 5 : 2.5} unit={unit} />

          <div className="card">
            <div className="gm-micro" style={{ marginBottom: 8 }}>{t('BAR WEIGHT')}</div>
            <SegPills
              options={barPresets.map(v => ({ value: v, label: v === 0 ? t('No bar') : `${v} ${unit}` }))}
              value={barW}
              onChange={setBarW}
            />
          </div>

          <div className="card">
            <div className="gm-micro" style={{ marginBottom: 10 }}>{t('EACH SIDE')}</div>
            {res.perSide.length === 0 ? (
              <div className="dim small">{t('Empty bar — add weight above bar weight.')}</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {res.perSide.map(item => (
                  <div
                    key={item.plate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 999,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--sep-op)',
                      fontWeight: 800,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: PLATE_COLORS[item.plate] || 'var(--acc)',
                      }}
                    />
                    <span>{item.count} × {item.plate} {unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (activeTool.id === 'warmup') {
      const sets = calcWarmupSets(wuTarget, barW, unit)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField label={t('Working Weight')} value={wuTarget} onChange={setWuTarget} step={isLb ? 5 : 2.5} unit={unit} />
            <NumField label={t('Bar Weight')} value={barW} onChange={setBarW} step={isLb ? 5 : 2.5} unit={unit} />
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="gm-micro">{t('WARM-UP RAMP')}</div>
            {sets.map((s, idx) => (
              <div
                key={idx}
                className="row between"
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: 16,
                  padding: '12px 14px',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{t('Set {0}', idx + 1)} · {t(s.label)}</div>
                  <div style={{ fontSize: 12, color: 'var(--label-2)', fontWeight: 600 }}>
                    {s.pct ? `${s.pct}% of working weight` : t('Loosen joints & groove path')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--acc)' }}>{s.weight} {unit}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--label-2)' }}>× {s.reps} {t('reps')}</div>
                </div>
              </div>
            ))}
            <div
              className="row between"
              style={{
                background: 'color-mix(in srgb, var(--acc) 16%, var(--surface-2))',
                border: '1px solid color-mix(in srgb, var(--acc) 40%, transparent)',
                borderRadius: 16,
                padding: '12px 14px',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{t('Working Sets')}</div>
                <div style={{ fontSize: 12, color: 'var(--label-2)', fontWeight: 600 }}>{t('Ready to lift')}</div>
              </div>
              <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--acc)' }}>{wuTarget} {unit}</div>
            </div>
          </div>
        </div>
      )
    }

    if (activeTool.id === 'rpe') {
      const res = calcRpeLoad(rpeW, rpeReps, rpeNow, rpeTargetReps, rpeTargetRpe)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('TARGET WORKING WEIGHT')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
              <RollingText value={res.targetWeight} style={{ fontSize: 44, fontWeight: 900 }} />
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--label-2)' }}>{unit}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-2)', marginTop: 6 }}>
              {res.pctGoal}% {t('of')} {res.oneRm} {unit} e1RM · RIR {Math.max(0, Math.round((10 - rpeTargetRpe) * 10) / 10)}
            </div>
          </div>

          <div className="card">
            <div className="gm-micro" style={{ marginBottom: 10 }}>{t('REFERENCE SET')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <NumField label={t('Weight')} value={rpeW} onChange={setRpeW} step={2.5} unit={unit} />
              <NumField label={t('Reps')} value={rpeReps} onChange={setRpeReps} step={1} min={1} max={20} />
              <NumField label={t('RPE')} value={rpeNow} onChange={setRpeNow} step={0.5} min={5} max={10} />
            </div>
          </div>

          <div className="card">
            <div className="gm-micro" style={{ marginBottom: 10 }}>{t('TARGET SET')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumField label={t('Target Reps')} value={rpeTargetReps} onChange={setRpeTargetReps} step={1} min={1} max={20} />
              <NumField label={t('Target RPE')} value={rpeTargetRpe} onChange={setRpeTargetRpe} step={0.5} min={5} max={10} />
            </div>
          </div>
        </div>
      )
    }

    if (activeTool.id === 'dots' || activeTool.id === 'wilks') {
      const totalKg = (Number(squat) || 0) + (Number(bench) || 0) + (Number(deadlift) || 0)
      const res = activeTool.id === 'dots' ? calcDots(bwKg, totalKg, sex) : calcWilks(bwKg, totalKg, sex)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>
              {activeTool.id === 'dots' ? t('DOTS SCORE') : t('WILKS SCORE')}
            </div>
            <RollingText value={res.score} style={{ fontSize: 48, fontWeight: 900, marginTop: 6 }} />
            <div style={{ marginTop: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '5px 14px',
                  borderRadius: 999,
                  background: 'color-mix(in srgb, var(--gm-sage) 20%, var(--surface-2))',
                  color: 'var(--gm-sage)',
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {t(res.level)} · {t('Total')} {totalKg} kg
              </span>
            </div>
          </div>

          <SegPills
            options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
            value={sex}
            onChange={setSex}
          />
          <NumField label={t('Bodyweight (kg)')} value={bwKg} onChange={setBwKg} step={0.5} min={40} max={210} unit="kg" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <NumField label={t('Squat')} value={squat} onChange={setSquat} step={2.5} unit="kg" />
            <NumField label={t('Bench')} value={bench} onChange={setBench} step={2.5} unit="kg" />
            <NumField label={t('Deadlift')} value={deadlift} onChange={setDeadlift} step={2.5} unit="kg" />
          </div>
        </div>
      )
    }

    if (activeTool.id === 'bmi') {
      const res = calcBmi(bwKg, heightCm)
      const pct = Math.max(0, Math.min(100, ((res.bmi - 15) / 25) * 100))
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('BODY MASS INDEX')}</div>
            <RollingText value={res.bmi} style={{ fontSize: 48, fontWeight: 900, marginTop: 6 }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gm-sage)', marginTop: 4 }}>{t(res.category)}</div>
            <div style={{ position: 'relative', height: 10, borderRadius: 99, overflow: 'hidden', marginTop: 18, display: 'flex' }}>
              <div style={{ flex: 14, background: '#7FA8C9' }} />
              <div style={{ flex: 26, background: '#8FA377' }} />
              <div style={{ flex: 20, background: '#E0B15A' }} />
              <div style={{ flex: 40, background: '#D97B72' }} />
              <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${pct}%`, width: 4, borderRadius: 2, background: '#fff', boxShadow: '0 0 8px rgba(0,0,0,0.6)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField label={t('Weight')} value={bwKg} onChange={setBwKg} step={0.5} min={30} max={250} unit="kg" />
            <NumField label={t('Height')} value={heightCm} onChange={setHeightCm} step={1} min={120} max={230} unit="cm" />
          </div>
        </div>
      )
    }

    if (activeTool.id === 'bf') {
      const res = calcNavyBodyFat(sex, heightCm, neckCm, waistCm, hipCm)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('US NAVY ESTIMATE')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <RollingText value={res.bf} style={{ fontSize: 48, fontWeight: 900 }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--label-2)' }}>%</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gm-sage)', marginTop: 4 }}>{t(res.category)}</div>
            <button type="button" className="btn primary" style={{ marginTop: 16 }} onClick={() => saveBfToMeasures(res.bf)}>
              {t('Save to Body Measures')}
            </button>
          </div>
          <SegPills
            options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
            value={sex}
            onChange={setSex}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField label={t('Height')} value={heightCm} onChange={setHeightCm} step={1} min={120} max={230} unit="cm" />
            <NumField label={t('Neck')} value={neckCm} onChange={setNeckCm} step={0.5} min={22} max={60} unit="cm" />
            <NumField label={t('Waist')} value={waistCm} onChange={setWaistCm} step={0.5} min={45} max={160} unit="cm" />
            {sex === 'female' && (
              <NumField label={t('Hips')} value={hipCm} onChange={setHipCm} step={0.5} min={60} max={160} unit="cm" />
            )}
          </div>
        </div>
      )
    }

    if (activeTool.id === 'ffmi') {
      const res = calcFfmi(bwKg, heightCm, bfPct, sex)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('NORMALIZED FFMI')}</div>
            <RollingText value={res.normalized} style={{ fontSize: 48, fontWeight: 900, marginTop: 6 }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gm-sage)', marginTop: 4 }}>{t(res.level)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 12 }}>
                <div className="gm-micro" style={{ fontSize: 10 }}>{t('RAW FFMI')}</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{res.ffmi}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 12 }}>
                <div className="gm-micro" style={{ fontSize: 10 }}>{t('LEAN MASS')}</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{res.leanKg} kg</div>
              </div>
            </div>
          </div>
          <SegPills
            options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
            value={sex}
            onChange={setSex}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <NumField label={t('Weight')} value={bwKg} onChange={setBwKg} step={0.5} unit="kg" />
            <NumField label={t('Height')} value={heightCm} onChange={setHeightCm} step={1} unit="cm" />
            <NumField label={t('Body Fat')} value={bfPct} onChange={setBfPct} step={0.5} min={4} max={55} unit="%" />
          </div>
        </div>
      )
    }

    if (activeTool.id === 'cal') {
      const res = calcTdee(sex, age, heightCm, bwKg, activity)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('MAINTENANCE TDEE')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <RollingText value={res.tdee} style={{ fontSize: 44, fontWeight: 900 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--label-2)' }}>kcal</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--label-2)', fontWeight: 700, marginTop: 4 }}>
              BMR {res.bmr} kcal
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 10 }}>
                <div className="gm-micro" style={{ fontSize: 9.5 }}>{t('CUT')}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#7FA8C9', marginTop: 3 }}>{res.cut}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 10 }}>
                <div className="gm-micro" style={{ fontSize: 9.5 }}>{t('HOLD')}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--gm-sage)', marginTop: 3 }}>{res.tdee}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 10 }}>
                <div className="gm-micro" style={{ fontSize: 9.5 }}>{t('BULK')}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--acc)', marginTop: 3 }}>{res.bulk}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 14, fontSize: 13, fontWeight: 800 }}>
              <span style={{ color: 'var(--acc)' }}>P {res.macros.protein}g</span>
              <span style={{ color: 'var(--gm-sage)' }}>C {res.macros.carbs}g</span>
              <span style={{ color: 'var(--gm-brass)' }}>F {res.macros.fat}g</span>
            </div>
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => applyNutritionGoals({
                kcal: res.tdee,
                protein: res.macros.protein,
                carbs: res.macros.carbs,
                fat: res.macros.fat,
              })}
            >
              {t('Apply to Nutrition Goals')}
            </button>
          </div>

          <SegPills
            options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
            value={sex}
            onChange={setSex}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <NumField label={t('Age')} value={age} onChange={setAge} step={1} min={14} max={90} />
            <NumField label={t('Height')} value={heightCm} onChange={setHeightCm} step={1} unit="cm" />
            <NumField label={t('Weight')} value={bwKg} onChange={setBwKg} step={0.5} unit="kg" />
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="gm-micro">{t('ACTIVITY LEVEL')}</div>
            {ACTIVITY_LEVELS.map(lv => {
              const on = activity === lv.v
              return (
                <button
                  key={lv.v}
                  type="button"
                  onClick={() => setActivity(lv.v)}
                  className="row between"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: on ? 'color-mix(in srgb, var(--acc) 18%, var(--surface-2))' : 'var(--surface-2)',
                    border: on ? '1px solid var(--acc)' : '1px solid transparent',
                    textAlign: 'left',
                    color: 'var(--label)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{t(lv.label)}</div>
                    <div style={{ fontSize: 12, color: 'var(--label-2)' }}>{t(lv.desc)}</div>
                  </div>
                  <span style={{ fontWeight: 800, color: on ? 'var(--acc)' : 'var(--label-3)', fontSize: 13 }}>×{lv.v}</span>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (activeTool.id === 'protein') {
      const res = calcProtein(bwKg, protGoal)
      const mid = Math.round((res.low + res.high) / 2)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('DAILY PROTEIN TARGET')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
              <RollingText value={`${res.low}–${res.high}`} style={{ fontSize: 40, fontWeight: 900 }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label-2)' }}>g / {t('day')}</span>
            </div>
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => applyNutritionGoals({ protein: mid })}
            >
              {t('Set Daily Goal to {0}g', mid)}
            </button>
          </div>
          <NumField label={t('Bodyweight')} value={bwKg} onChange={setBwKg} step={0.5} unit="kg" />
          <SegPills
            options={[
              { value: 'lose', label: t('Cut') },
              { value: 'hold', label: t('Maintain') },
              { value: 'gain', label: t('Build Muscle') },
            ]}
            value={protGoal}
            onChange={setProtGoal}
          />
        </div>
      )
    }

    if (activeTool.id === 'water') {
      const res = calcWater(bwKg, trainMin)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ textAlign: 'center', padding: '22px 18px' }}>
            <div className="gm-micro" style={{ color: '#7FA8C9' }}>{t('DAILY HYDRATION')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
              <RollingText value={res.liters} style={{ fontSize: 46, fontWeight: 900 }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--label-2)' }}>L</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-2)', marginTop: 4 }}>
              {res.ml} ml · ~{Math.round(res.ml / 250)} {t('glasses')}
            </div>
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => applyNutritionGoals({ waterMl: res.ml })}
            >
              {t('Apply to Water Goal')}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField label={t('Bodyweight')} value={bwKg} onChange={setBwKg} step={0.5} unit="kg" />
            <NumField label={t('Training')} value={trainMin} onChange={setTrainMin} step={15} min={0} max={240} unit="min" />
          </div>
        </div>
      )
    }

    return null
  }

  const visibleGroups = useMemo(() => {
    const groups = ['strength', 'body', 'nutrition']
    return groups
      .filter(g => groupFilter === 'all' || groupFilter === g)
      .map(g => ({ id: g, title: GROUP_LABELS[g], items: TOOL_META.filter(x => x.group === g) }))
  }, [groupFilter])

  return (
    <div className="narrow" style={{ paddingBottom: 40 }}>
      <CollapsedHeader title={activeTool ? t(activeTool.name) : t('Tools')} />

      <div className="hdr" style={{ gap: 10 }}>
        <button
          type="button"
          className="iconbtn"
          onClick={() => (activeTool ? openTool('') : nav(-1))}
          aria-label={t('Back')}
        >
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1 }}>
          <h1>{activeTool ? t(activeTool.name) : t('Tools')}</h1>
          <div className="sub">{activeTool ? t(activeTool.desc) : t('12 training, body & nutrition calculators')}</div>
        </div>
      </div>

      {activeTool ? (
        <Rise index={0}>{renderToolDetail()}</Rise>
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 18 }}>
            {[
              { id: 'all', label: t('All (12)') },
              { id: 'strength', label: t('Strength') },
              { id: 'body', label: t('Body') },
              { id: 'nutrition', label: t('Nutrition') },
            ].map(chip => (
              <button
                key={chip.id}
                type="button"
                className={'chip' + (groupFilter === chip.id ? ' on' : '')}
                onClick={() => setGroupFilter(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {visibleGroups.map((grp, gIdx) => (
            <Rise key={grp.id} index={gIdx} style={{ marginBottom: 20 }}>
              <div className="gm-micro" style={{ marginBottom: 10, paddingLeft: 2 }}>{t(grp.title)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))', gap: 10 }}>
                {grp.items.map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => openTool(tool.id)}
                    className="card"
                    style={{
                      margin: 0,
                      padding: '15px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: 'color-mix(in srgb, var(--acc) 16%, var(--surface-2))',
                        color: 'var(--acc)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                      }}
                    >
                      <Icon name={tool.icon} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--label)' }}>{t(tool.name)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--label-2)', marginTop: 3, lineHeight: 1.35 }}>
                        {t(tool.desc)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Rise>
          ))}
        </>
      )}
    </div>
  )
}
