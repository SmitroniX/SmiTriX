import { useState, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, NumberField } from './ui.jsx'
import { useUI } from '../store/useUI.js'

function compressAvatarImage(file, size = 256, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image file'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function EditProfileModal({ close }) {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const athlete = S.athleteProfile || {}
  const avatarInputRef = useRef(null)

  const [name, setName] = useState(user?.name || '')
  const [photoURL, setPhotoURL] = useState(athlete.photoURL || user?.photoURL || '')
  const [bodyType, setBodyType] = useState(athlete.bodyType || 'mesomorph')
  const [goal, setGoal] = useState(athlete.goal || 'hypertrophy')
  const [height, setHeight] = useState(athlete.height || 178)
  const [targetWeight, setTargetWeight] = useState(S.targetW || athlete.targetWeight || 75)
  const [bio, setBio] = useState(athlete.bio || '')

  const handleAvatarFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressAvatarImage(file)
      setPhotoURL(dataUrl)
      toast(t('Photo ready — tap Save Profile to apply'))
    } catch (err) {
      toast(err.message || t('Could not process photo'))
    } finally {
      e.target.value = ''
    }
  }

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
    const cleanName = name.trim() || 'Athlete'
    update(s => {
      s.targetW = targetWeight ? Number(targetWeight) : null
      s.athleteProfile = {
        ...(s.athleteProfile || {}),
        photoURL: photoURL || '',
        bodyType,
        goal,
        height: Number(height) || 175,
        targetWeight: Number(targetWeight) || null,
        bio: bio.trim().slice(0, 160)
      }
    })
    if (user) {
      setUser({ ...user, name: cleanName, photoURL: photoURL || '' })
    } else {
      useStore.setState(state => ({
        ...state,
        user: { name: cleanName, photoURL: photoURL || '' }
      }))
    }
    toast(t('Profile updated'))
    close()
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarFile}
      />
      <div className="row between" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{t('Edit Athlete Profile')}</h3>
        <button className="iconbtn" onClick={close} aria-label="Close"><Icon name="xmark" /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Profile Photo Upload Row */}
        <div className="row" style={{ gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--sep-op)' }}>
          <div
            onClick={() => avatarInputRef.current?.click()}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: photoURL ? `url(${photoURL}) center/cover no-repeat` : 'var(--surface-3)',
              border: '2px solid var(--acc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              color: photoURL ? 'transparent' : 'var(--label)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {(name.trim() || 'A')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)', marginBottom: 6 }}>
              {t('Profile Photo')}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  background: 'var(--acc)',
                  color: '#ffffff',
                  border: 0,
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Icon name="camera" style={{ fontSize: 14 }} />
                <span>{photoURL ? t('Change Photo') : t('Upload Photo')}</span>
              </button>
              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL('')}
                  style={{
                    background: 'transparent',
                    color: 'var(--red)',
                    border: '1px solid var(--sep-op)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('Remove')}
                </button>
              )}
            </div>
          </div>
        </div>
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
