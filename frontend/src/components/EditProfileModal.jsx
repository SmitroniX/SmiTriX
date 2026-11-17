import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, NumberField } from './ui.jsx'
import { useUI } from '../store/useUI.js'

export default function EditProfileModal({ close }) {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const athlete = S.athleteProfile || {}

  const [name, setName] = useState(user?.name || '')
  const [bodyType, setBodyType] = useState(athlete.bodyType || 'mesomorph')
  const [goal, setGoal] = useState(athlete.goal || 'hypertrophy')
  const [height, setHeight] = useState(athlete.height || 178)
  const [targetWeight, setTargetWeight] = useState(S.targetW || athlete.targetWeight || 75)
  const [bio, setBio] = useState(athlete.bio || '')

  const bodyTypes = [
    { id: 'ectomorph', label: 'Ectomorph', desc: 'Naturally lean, fast metabolism, hardgainer mass focus' },
    { id: 'mesomorph', label: 'Mesomorph', desc: 'Naturally athletic, balanced muscular build, high power output' },
    { id: 'endomorph', label: 'Endomorph', desc: 'Naturally stocky, metabolic density focus, high endurance' }
  ]

  const goals = [
    { id: 'hypertrophy', label: t('Hypertrophy (Muscle Size)') },
    { id: 'strength', label: t('Max Strength (Powerlifting)') },
    { id: 'fatloss', label: t('Body Recomp & Fat Loss') },
    { id: 'endurance', label: t('Athletic Conditioning') }
  ]

  const handleSave = () => {
    update(s => {
      s.targetW = targetWeight ? Number(targetWeight) : null
      s.athleteProfile = {
        ...(s.athleteProfile || {}),
        bodyType,
        goal,
        height: Number(height) || 175,
        targetWeight: Number(targetWeight) || null,
        bio: bio.trim().slice(0, 160)
      }
    })
    useStore.setState(state => ({
      ...state,
      user: state.user ? { ...state.user, name: name.trim() || 'Athlete' } : { name: name.trim() || 'Athlete' }
    }))
    toast(t('Profile updated'))
    close()
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{t('Edit Athlete Profile')}</h3>
        <button className="iconbtn" onClick={close} aria-label="Close"><Icon name="xmark" /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Name */}
        <div>
          <label className="small dim" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{t('Athlete Name')}</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('e.g. Alex Runner')}
          />
        </div>

        {/* Body Type Selection */}
        <div>
          <label className="small dim" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            🧬 {t('Somatotype / Body Type')}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bodyTypes.map(bt => (
              <button
                key={bt.id}
                type="button"
                className={'item' + (bodyType === bt.id ? ' plan-day-active' : '')}
                onClick={() => setBodyType(bt.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: bodyType === bt.id ? '1.5px solid var(--acc)' : '1px solid var(--sep-op)',
                  background: bodyType === bt.id ? 'var(--acc-soft)' : 'var(--surface-2)',
                  cursor: 'pointer'
                }}
              >
                <div className="tt" style={{ fontSize: 14, fontWeight: 700, color: bodyType === bt.id ? 'var(--acc)' : 'var(--label)' }}>
                  {bt.label}
                </div>
                <div className="ss" style={{ fontSize: 12, color: 'var(--label-3)' }}>{bt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Goal */}
        <div>
          <label className="small dim" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            🎯 {t('Primary Training Goal')}
          </label>
          <div className="share-theme-selector" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {goals.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: goal === g.id ? '1.5px solid var(--acc)' : '1px solid var(--sep-op)',
                  background: goal === g.id ? 'var(--acc-soft)' : 'var(--surface-2)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: goal === g.id ? 'var(--acc)' : 'var(--label)' }}>{g.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Biometrics (Height & Target Weight) */}
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="small dim" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{t('Height (cm)')}</label>
            <input
              type="number"
              className="input"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="178"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small dim" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{t('Target Weight ({0})', S.unit)}</label>
            <input
              type="number"
              className="input"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              placeholder="75"
            />
          </div>
        </div>

        {/* Bio / Training Motto */}
        <div>
          <label className="small dim" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{t('Athlete Bio / Training Motto')}</label>
          <textarea
            className="input"
            rows={2}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder={t('“No days off. Progressive overload every session.”')}
            maxLength={160}
          />
        </div>
      </div>

      <div style={{ height: 16 }} />
      <Button variant="primary" onClick={handleSave}>{t('Save Profile')}</Button>
    </div>
  )
}
