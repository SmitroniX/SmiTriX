import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'
import { Segmented } from './ui.jsx'
import { RollingText } from './GymManeMotion.jsx'
import { t } from '../lib/i18n.js'
import { DEMO } from '../lib/demo.js'
import { CATALOGUE } from '../lib/exercises.js'
import { todayISO } from '../lib/format.js'
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'

export const TUTORIAL_STORAGE_KEY = 'smitrix_tutorial_seen_v1'

export function hasSeenTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1')
  } catch {}
}

export function resetTutorialSeen() {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
  } catch {}
}

const PLACE_PRESETS = [
  {
    id: 'gym',
    name: 'Commercial Gym',
    sub: 'Barbells, cables, machines, dumbbells & benches',
    icon: 'dumbbell',
    equipment: ['barbell', 'dumbbell', 'cable', 'machine', 'body weight', 'ez barbell', 'kettlebell', 'smith machine', 'leverage machine', 'sled machine', 'band'],
  },
  {
    id: 'home',
    name: 'Home Gym',
    sub: 'Dumbbells, bench, pull-up bar, bands & bodyweight',
    icon: 'home',
    equipment: ['dumbbell', 'body weight', 'kettlebell', 'band', 'resistance band', 'barbell'],
  },
  {
    id: 'outdoors',
    name: 'Outdoors / Park',
    sub: 'Bodyweight, pull-up bars, dip bars & resistance bands',
    icon: 'figureRun',
    equipment: ['body weight', 'band', 'resistance band', 'assisted'],
  },
]

function compressAvatar(file, maxDim = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image'))
      img.onload = () => {
        let w = img.width || 256
        let h = img.height || 256
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim }
          else { w = Math.round((w * maxDim) / h); h = maxDim }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

function WeekArcRing({ goal }) {
  const size = 154
  const cx = size / 2
  const cy = size / 2
  const r = 62
  const segCount = 7
  const gapDeg = 10
  const spanDeg = (360 - segCount * gapDeg) / segCount

  const arcPath = idx => {
    const startDeg = -90 + idx * (spanDeg + gapDeg) + gapDeg / 2
    const endDeg = startDeg + spanDeg
    const rad = d => (d * Math.PI) / 180
    const x1 = cx + r * Math.cos(rad(startDeg))
    const y1 = cy + r * Math.sin(rad(startDeg))
    const x2 = cx + r * Math.cos(rad(endDeg))
    const y2 = cy + r * Math.sin(rad(endDeg))
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: segCount }, (_, i) => (
          <path
            key={i}
            d={arcPath(i)}
            fill="none"
            stroke={i < goal ? 'var(--ember)' : 'var(--surface-2)'}
            strokeWidth="10"
            strokeLinecap="round"
            style={{ transition: 'stroke 260ms var(--ease)' }}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <RollingText
          value={String(goal)}
          style={{ fontSize: 44, fontWeight: 900, color: 'var(--label)', lineHeight: 1.05 }}
        />
        <span className="gm-micro" style={{ fontSize: 9.5, marginTop: 4 }}>
          {goal === 1 ? t('DAY / WEEK') : t('DAYS / WEEK')}
        </span>
      </div>
    </div>
  )
}

/**
 * GymMane-style 7-Step Onboarding Flow for SmiTriX:
 * 0: Welcome (runner.png + 3 promises)
 * 1: Your Name (animated initial circle + live greeting)
 * 2: Profile Photo (circular camera avatar picker)
 * 3: Units (RollingText 100 kg / 225 lb)
 * 4: Your Body (sex, age, height, weight)
 * 5: Weekly Goal (7-arc SVG ring + 1..7 selector)
 * 6: Where You Train (Gym / Home / Outdoors presets + live exercise odometer)
 */
export function TutorialDialog({ initialStep = 0, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const athlete = S.athleteProfile || {}

  const TOTAL_STEPS = 7 // 0..6
  const [step, setStep] = useState(Math.max(0, Math.min(initialStep, TOTAL_STEPS - 1)))
  const [name, setName] = useState(athlete.name || '')
  const [photo, setPhoto] = useState(athlete.photoURL || '')
  const [unit, setUnit] = useState(S.unit || 'kg')
  const [sex, setSex] = useState(S.body === 'female' ? 'female' : 'male')
  const [age, setAge] = useState(Number(athlete.age) || 26)
  const [heightCm, setHeightCm] = useState(Number(athlete.height) || 175)
  const lastBwVal = S.bodyweight?.length ? Number(S.bodyweight[S.bodyweight.length - 1].w) : (unit === 'lb' ? 165 : 75)
  const [weight, setWeight] = useState(lastBwVal || 75)
  const [weeklyGoal, setWeeklyGoal] = useState(Number(S.weeklyTarget) || 4)
  const [selectedPlaces, setSelectedPlaces] = useState(['gym'])
  const fileRef = useRef(null)

  const trimmedName = name.trim()
  const firstInitial = trimmedName ? trimmedName[0].toUpperCase() : ''

  const matchedExercisesCount = useMemo(() => {
    if (!selectedPlaces.length) return CATALOGUE.length
    const eqSet = new Set(['body weight'])
    for (const pid of selectedPlaces) {
      const p = PLACE_PRESETS.find(x => x.id === pid)
      if (p) p.equipment.forEach(e => eqSet.add(e))
    }
    if (selectedPlaces.includes('gym')) return CATALOGUE.length
    return CATALOGUE.filter(ex => !ex.eq || eqSet.has(String(ex.eq).toLowerCase())).length
  }, [selectedPlaces])

  const handlePhotoPick = async ev => {
    const file = ev.target.files?.[0]
    if (!file) return
    try {
      const url = await compressAvatar(file)
      setPhoto(url)
    } catch {} finally {
      ev.target.value = ''
    }
  }

  const togglePlace = id => {
    setSelectedPlaces(prev =>
      prev.includes(id)
        ? (prev.length > 1 ? prev.filter(x => x !== id) : prev)
        : [...prev, id]
    )
  }

  const finish = () => {
    update(s => {
      s.onboarded = true
      s.unit = unit
      s.body = sex
      s.weeklyTarget = weeklyGoal
      s.athleteProfile = {
        ...(s.athleteProfile || {}),
        ...(trimmedName ? { name: trimmedName } : {}),
        ...(photo ? { photoURL: photo } : {}),
        sex,
        age,
        height: heightCm,
      }
      if (weight > 0 && !(s.bodyweight || []).length) {
        s.bodyweight = [{ d: todayISO(), w: weight, t: Date.now() }]
      }
      if (selectedPlaces.length && !(s.equipProfiles || []).length) {
        const created = selectedPlaces.map(pid => {
          const preset = PLACE_PRESETS.find(x => x.id === pid)
          return preset ? { id: 'place_' + preset.id, name: preset.name, equipment: [...preset.equipment] } : null
        }).filter(Boolean)
        if (created.length) {
          s.equipProfiles = created
          s.activeEquipId = created[0].id
        }
      }
    })
    markTutorialSeen()
    close?.()
  }

  const skip = () => {
    update(s => { s.onboarded = true })
    markTutorialSeen()
    close?.()
  }

  const isLast = step === TOTAL_STEPS - 1
  const nextLabel = isLast
    ? t('Start training')
    : step === 2 && !photo
      ? t('Maybe later')
      : t('Next')

  return (
    <div
      className="gm-onb-shell"
      role="dialog"
      aria-label={t('SmiTriX setup')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'min(76vh, 620px)',
        maxHeight: '86vh',
        position: 'relative',
      }}
    >
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoPick} />

      {/* Top 7-segment progress bar + Skip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px 14px' }}>
        <div style={{ display: 'flex', flex: 1, gap: 5 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t('Step {0}', i + 1)}
              onClick={() => setStep(i)}
              style={{
                flex: 1,
                height: 3.5,
                borderRadius: 99,
                padding: 0,
                background: i <= step ? 'var(--label)' : 'var(--surface-2)',
                transition: 'background 260ms var(--ease)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--label-3)',
            padding: '6px 8px',
            cursor: 'pointer',
          }}
        >
          {t('Skip')}
        </button>
      </div>

      {/* Step Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 2px 16px' }}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}>
              <img
                src="./smitrix-ui/img/runner.png"
                alt="SmiTriX"
                style={{ height: 152, objectFit: 'contain', opacity: 0.92 }}
              />
            </div>
            <div>
              <div className="gm-micro" style={{ marginBottom: 6 }}>{t('YOUR TRAINING LOG')}</div>
              <h2 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1 }}>
                SmiTriX
              </h2>
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.5, margin: 0 }}>
                {t('Your workouts, your numbers, always on your device.')}
              </p>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--sep-op)' }}>
              {[
                { icon: 'sparkles', title: t('Free forever'), why: t('No subscriptions, no paywalls, no ads.') },
                { icon: 'shield', title: t('Private & local-first'), why: t('Everything stays on your device. No account needed on web.') },
                { icon: 'download', title: t('Yours to take'), why: t('Import from Hevy, Strong or FitNotes, and export full backups anytime.') },
              ].map((p, idx) => (
                <div
                  key={p.title}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 13,
                    padding: '13px 15px',
                    borderTop: idx > 0 ? '1px solid var(--sep-op)' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--acc)', fontSize: 18, marginTop: 1, flex: 'none' }}>
                    <Icon name={p.icon} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--label)' }}>{p.title}</div>
                    <div className="dim small" style={{ marginTop: 2, lineHeight: 1.4 }}>{p.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '14px 0 4px' }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  background: trimmedName ? 'var(--ember)' : 'var(--surface-2)',
                  color: trimmedName ? 'var(--on-ember)' : 'var(--label-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                  fontWeight: 900,
                  transition: 'background 240ms var(--ease), color 240ms var(--ease)',
                }}
              >
                {firstInitial || <Icon name="person" style={{ fontSize: 34 }} />}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, opacity: trimmedName ? 1 : 0.4, transition: 'opacity 200ms' }}>
                {t('Hello, {0}', trimmedName || '…')}
              </div>
            </div>
            <div>
              <div className="gm-micro" style={{ marginBottom: 6 }}>{t('STEP {0} OF {1}', 1, 6)}</div>
              <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
                {t('What should we call you?')}
              </h2>
              <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
                {t('Used on your profile, workout recaps and share stickers.')}
              </p>
            </div>
            <div style={{
              background: 'var(--surface-2)',
              borderRadius: 18,
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1px solid var(--sep-op)',
            }}>
              <Icon name="personCircle" style={{ fontSize: 20, color: 'var(--label-2)' }} />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('Your name')}
                maxLength={40}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 0,
                  outline: 'none',
                  color: 'var(--label)',
                  fontSize: 16.5,
                  fontWeight: 700,
                  padding: '12px 0',
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0 4px' }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={photo ? t('Change photo') : t('Add photo')}
                style={{ position: 'relative', width: 112, height: 112, padding: 0, cursor: 'pointer' }}
              >
                <div style={{
                  width: 112,
                  height: 112,
                  borderRadius: '50%',
                  background: photo ? `url(${photo}) center/cover no-repeat` : 'var(--surface-2)',
                  border: '2px solid var(--sep)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--label-3)',
                  fontSize: 40,
                }}>
                  {!photo && <Icon name="person" />}
                </div>
                <span style={{
                  position: 'absolute',
                  right: 2,
                  bottom: 2,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--acc)',
                  color: 'var(--on-acc)',
                  border: '3px solid var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                }}>
                  <Icon name="camera" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ marginTop: 10, fontSize: 13.5, fontWeight: 800, color: 'var(--acc)', cursor: 'pointer' }}
              >
                {photo ? t('Change photo') : t('Add a photo')}
              </button>
            </div>
            <div>
              <div className="gm-micro" style={{ marginBottom: 6 }}>{t('STEP {0} OF {1}', 2, 6)}</div>
              <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
                {t('Add a profile photo')}
              </h2>
              <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
                {t('Stored locally on your device. You can add or change it anytime from your profile.')}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, padding: '22px 0 8px' }}>
              <RollingText
                value={unit === 'kg' ? '100' : '225'}
                style={{ fontSize: 64, fontWeight: 900, color: 'var(--label)', letterSpacing: '-0.04em' }}
              />
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--acc)' }}>{unit}</span>
            </div>
            <div>
              <div className="gm-micro" style={{ marginBottom: 6 }}>{t('STEP {0} OF {1}', 3, 6)}</div>
              <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
                {t('How do you measure weight?')}
              </h2>
              <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
                {t('Sets, bars, plates and body weight will use this unit. You can convert later in Settings.')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { id: 'kg', label: 'kg', sub: t('Kilograms') },
                { id: 'lb', label: 'lb', sub: t('Pounds') },
              ].map(opt => {
                const on = unit === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      if (opt.id !== unit) {
                        setWeight(w => opt.id === 'lb' ? Math.round(w * 2.2046) : Math.round(w / 2.2046))
                        setUnit(opt.id)
                      }
                    }}
                    style={{
                      padding: '20px 16px',
                      borderRadius: 22,
                      background: on ? 'var(--ember)' : 'var(--surface-2)',
                      color: on ? 'var(--on-ember)' : 'var(--label)',
                      border: on ? '1.5px solid var(--ember)' : '1px solid var(--sep-op)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 180ms var(--ease)',
                    }}
                  >
                    <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{opt.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.72, marginTop: 6 }}>{opt.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="gm-micro" style={{ marginBottom: 6 }}>{t('STEP {0} OF {1}', 4, 6)}</div>
              <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
                {t('A little about your body')}
              </h2>
              <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
                {t('Used for your muscle diagram, BMI, calories and strength standards.')}
              </p>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--sep-op)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid var(--sep-op)' }}>
                <span className="row" style={{ gap: 10, fontSize: 14.5, fontWeight: 600 }}>
                  <Icon name="figureStrength" style={{ color: 'var(--label-2)' }} />
                  {t('Body diagram')}
                </span>
                <Segmented
                  className="seg-inline"
                  options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
                  value={sex}
                  onChange={setSex}
                />
              </div>
              {[
                { icon: 'calendar', label: t('Age'), val: age, unitTxt: t('yrs'), min: 13, max: 99, stepVal: 1, set: setAge },
                { icon: 'ruler', label: t('Height'), val: heightCm, unitTxt: 'cm', min: 120, max: 230, stepVal: 1, set: setHeightCm },
                { icon: 'scale', label: t('Body weight'), val: weight, unitTxt: unit, min: 30, max: 300, stepVal: 1, set: setWeight },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 15px',
                    borderTop: idx > 0 ? '1px solid var(--sep-op)' : 'none',
                  }}
                >
                  <span className="row" style={{ gap: 10, fontSize: 14.5, fontWeight: 600 }}>
                    <Icon name={item.icon} style={{ color: 'var(--label-2)' }} />
                    {item.label}
                  </span>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      aria-label={t('Decrease {0}', item.label)}
                      onClick={() => item.set(v => Math.max(item.min, v - item.stepVal))}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Icon name="minus" style={{ fontSize: 13 }} />
                    </button>
                    <span style={{ minWidth: 66, textAlign: 'center', fontWeight: 800, fontSize: 15 }}>
                      {item.val} <span className="dim small">{item.unitTxt}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={t('Increase {0}', item.label)}
                      onClick={() => item.set(v => Math.min(item.max, v + item.stepVal))}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Icon name="plus" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ padding: '6px 0 2px' }}>
              <WeekArcRing goal={weeklyGoal} />
            </div>
            <div>
              <div className="gm-micro" style={{ marginBottom: 6 }}>{t('STEP {0} OF {1}', 5, 6)}</div>
              <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
                {t('Weekly training goal')}
              </h2>
              <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
                {t('Sets your ring on Home and keeps your weekly streak honest.')}
              </p>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: 999,
              background: 'var(--surface-2)',
              border: '1px solid var(--sep-op)',
            }}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => {
                const lit = n <= weeklyGoal
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={n === weeklyGoal}
                    onClick={() => setWeeklyGoal(n)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: lit ? 'var(--ember)' : 'var(--surface)',
                      color: lit ? 'var(--on-ember)' : 'var(--label-3)',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 180ms var(--ease)',
                    }}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', padding: '10px 0 2px' }}>
              <RollingText
                value={String(matchedExercisesCount)}
                style={{ fontSize: 48, fontWeight: 900, color: 'var(--label)', letterSpacing: '-0.03em' }}
              />
              <div className="gm-micro" style={{ marginTop: 4 }}>{t('EXERCISES READY FOR YOUR GEAR')}</div>
            </div>
            <div>
              <div className="gm-micro" style={{ marginBottom: 6 }}>{t('STEP {0} OF {1}', 6, 6)}</div>
              <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
                {t('Where do you train?')}
              </h2>
              <p className="muted small" style={{ margin: 0, lineHeight: 1.45 }}>
                {t('Pick one or more places so SmiTriX knows what equipment you have.')}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PLACE_PRESETS.map(p => {
                const on = selectedPlaces.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePlace(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      padding: '14px 15px',
                      borderRadius: 20,
                      background: on ? 'color-mix(in srgb, var(--acc) 14%, var(--surface-2))' : 'var(--surface-2)',
                      border: on ? '1.5px solid var(--acc)' : '1px solid var(--sep-op)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: on ? 'var(--acc)' : 'var(--surface)',
                      color: on ? 'var(--on-acc)' : 'var(--label-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flex: 'none',
                    }}>
                      <Icon name={p.icon} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>{t(p.name)}</div>
                      <div className="dim small" style={{ marginTop: 2 }}>{t(p.sub)}</div>
                    </div>
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: on ? 'var(--acc)' : 'transparent',
                      border: on ? 'none' : '1.5px solid var(--sep)',
                      color: 'var(--on-acc)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}>
                      {on && <Icon name="check" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: '1px solid var(--sep-op)' }}>
        {step > 0 && (
          <button
            type="button"
            aria-label={t('Back')}
            onClick={() => setStep(s => Math.max(0, s - 1))}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              color: 'var(--label)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name="chevronLeft" />
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          style={{ flex: 1, minHeight: 50, fontSize: 15.5 }}
          onClick={() => isLast ? finish() : setStep(s => s + 1)}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

export function openTutorial(initialStep = 0) {
  useUI.getState().openSheet(close => <TutorialDialog initialStep={initialStep} close={close} />, { kind: 'center' })
}

// Compatibility stub if imported elsewhere (no longer mounted on Home)
export function TutorialWelcomeCard({ onDismiss }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="row between" style={{ gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{t('Set up SmiTriX')}</div>
          <div className="dim small">{t('Pick your units, weekly goal and gym equipment')}</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn primary sm" onClick={() => openTutorial(0)}>{t('Start')}</button>
          {onDismiss && (
            <button type="button" className="iconbtn" aria-label={t('Dismiss')} onClick={onDismiss}>
              <Icon name="xmark" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Automatically shows the GymMane-style 7-step Onboarding once for brand-new users
 * (never blocks the embedded live website demo or /login /admin routes).
 */
export function TutorialPromptChecker() {
  const loc = useLocation()
  const ready = useStore(s => s.ready)
  const S = useStore(s => s.S)
  const needsMobileOnboarding = useStore(s => s.needsMobileOnboarding)
  const sheets = useUI(s => s.sheets)

  useEffect(() => {
    if (!ready || needsMobileOnboarding || DEMO) return
    if (typeof window !== 'undefined' && window.self !== window.top) return
    if (loc.pathname.startsWith('/admin') || loc.pathname.startsWith('/login')) return
    if (hasSeenTutorial() || S.onboarded) return
    if ((S.workouts || []).length > 0) {
      markTutorialSeen()
      return
    }
    if (sheets.length > 0) return

    const timer = setTimeout(() => {
      if (!hasSeenTutorial() && !useStore.getState().S.onboarded && useUI.getState().sheets.length === 0) {
        openTutorial(0)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [ready, needsMobileOnboarding, S.onboarded, S.workouts, loc.pathname, sheets.length])

  return null
}
