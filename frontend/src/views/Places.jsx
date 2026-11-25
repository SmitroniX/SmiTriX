import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { Switch } from '../components/ui.jsx'
import { CollapsedHeader, Rise } from '../components/GymManeMotion.jsx'
import { confirmSheet } from '../sheets.jsx'
import { ALL_EQUIPMENT, newProfile } from '../lib/equipment.js'
import { PLACE_PRESETS } from '../lib/gymmane-measures.js'
import { t } from '../lib/i18n.js'

const PLATE_OPTIONS_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]
const PLATE_OPTIONS_LB = [45, 35, 25, 10, 5, 2.5, 1.25]

function PlaceEditorSheet({ existing, unit, close }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const plateChoices = unit === 'lb' ? PLATE_OPTIONS_LB : PLATE_OPTIONS_KG

  const [name, setName] = useState(existing?.name || '')
  const [equipment, setEquipment] = useState(existing?.equipment || ['barbell', 'dumbbell', 'body weight'])
  const [plates, setPlates] = useState(existing?.plates || (unit === 'lb' ? [45, 35, 25, 10, 5, 2.5] : [20, 15, 10, 5, 2.5, 1.25]))
  const [barWeight, setBarWeight] = useState(existing?.barWeight ?? (unit === 'lb' ? 45 : 20))

  const toggleEq = eq => setEquipment(prev => (prev.includes(eq) ? prev.filter(x => x !== eq) : [...prev, eq]))
  const togglePlate = p => setPlates(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a, b) => b - a)))

  const save = () => {
    const clean = name.trim()
    if (!clean) { toast(t('Give this place a name')); return }
    update(s => {
      s.equipProfiles = s.equipProfiles || []
      if (existing) {
        const target = s.equipProfiles.find(x => x.id === existing.id)
        if (target) {
          target.name = clean
          target.equipment = equipment
          target.plates = plates
          target.barWeight = Number(barWeight) || (unit === 'lb' ? 45 : 20)
        }
      } else {
        const created = {
          ...newProfile(clean),
          equipment,
          plates,
          barWeight: Number(barWeight) || (unit === 'lb' ? 45 : 20),
        }
        s.equipProfiles.push(created)
        s.activeEquipId = created.id
        s.equipFilterOn = true
      }
    })
    toast(existing ? t('Place updated') : t('Place added & activated'))
    close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ margin: 0 }}>{existing ? t('Edit place') : t('New training place')}</h3>

      <input
        className="input"
        placeholder={t('e.g. Commercial Gym, Garage, Travel Hotel')}
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <div>
        <div className="gm-micro" style={{ fontSize: 10, marginBottom: 8 }}>{t('AVAILABLE EQUIPMENT')} ({equipment.length})</div>
        <div className="chips" style={{ maxHeight: 190, overflowY: 'auto' }}>
          {ALL_EQUIPMENT.map(eq => {
            const on = equipment.includes(eq)
            return (
              <button
                key={eq}
                type="button"
                className={'chip capitalize' + (on ? ' on' : '')}
                onClick={() => toggleEq(eq)}
              >
                {eq}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="gm-micro" style={{ fontSize: 10, marginBottom: 8 }}>
          {t('BARBELL PLATES AT THIS PLACE')} ({unit})
        </div>
        <div className="chips">
          {plateChoices.map(p => {
            const on = plates.includes(p)
            return (
              <button
                key={p}
                type="button"
                className={'chip' + (on ? ' on' : '')}
                onClick={() => togglePlate(p)}
              >
                {p} {unit}
              </button>
            )
          })}
        </div>
      </div>

      <div className="row between" style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 14px' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{t('Default barbell weight')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            inputMode="decimal"
            className="input"
            style={{ width: 72, textAlign: 'center', padding: '6px 8px' }}
            value={barWeight}
            onChange={e => setBarWeight(e.target.value)}
          />
          <span className="dim small">{unit}</span>
        </div>
      </div>

      <button type="button" className="btn primary" onClick={save}>
        {existing ? t('Save place') : t('Create place')}
      </button>
    </div>
  )
}

export default function Places() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const openSheet = useUI(s => s.openSheet)
  const toast = useUI(s => s.toast)

  const places = S.equipProfiles || []
  const unit = S.unit || 'kg'

  const openEditor = (existing = null) => {
    openSheet(close => <PlaceEditorSheet existing={existing} unit={unit} close={close} />)
  }

  const addPreset = preset => {
    update(s => {
      s.equipProfiles = s.equipProfiles || []
      const created = {
        ...newProfile(preset.name),
        equipment: [...preset.equipment],
        plates: [...preset.plates],
        barWeight: unit === 'lb' ? 45 : 20,
      }
      s.equipProfiles.push(created)
      s.activeEquipId = created.id
      s.equipFilterOn = true
    })
    toast(t('{0} added and set as active place', preset.name))
  }

  const activate = id => {
    update(s => {
      s.activeEquipId = id
      s.equipFilterOn = true
    })
    const found = places.find(p => p.id === id)
    if (found) toast(t('Training at {0}', found.name))
  }

  const remove = p => {
    confirmSheet({
      title: t('Remove place?'),
      message: t('"{0}" will be deleted from your places.', p.name),
      confirmText: t('Delete'),
      danger: true,
      onConfirm: () => {
        update(s => {
          s.equipProfiles = (s.equipProfiles || []).filter(x => x.id !== p.id)
          if (s.activeEquipId === p.id) {
            s.activeEquipId = s.equipProfiles[0]?.id || null
          }
        })
        toast(t('Place removed'))
      },
    })
  }

  return (
    <div className="narrow" style={{ paddingBottom: 40 }}>
      <CollapsedHeader title={t('Places')} />

      <div className="hdr" style={{ gap: 10 }}>
        <button type="button" className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1 }}>
          <h1>{t('Places')}</h1>
          <div className="sub">{t('Gyms, home setups & owned equipment')}</div>
        </div>
        <button type="button" className="btn primary" style={{ width: 'auto', padding: '9px 14px', fontSize: 13 }} onClick={() => openEditor(null)}>
          <Icon name="plus" style={{ fontSize: 13 }} /> {t('Place')}
        </button>
      </div>

      {/* Global filter switch */}
      {places.length > 0 && (
        <Rise index={0} className="card" style={{ marginBottom: 16 }}>
          <div className="row between" style={{ gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{t('Filter by active place')}</div>
              <div className="dim small" style={{ marginTop: 2 }}>
                {t('Only show exercises you have equipment for in Library & Train')}
              </div>
            </div>
            <Switch checked={!!S.equipFilterOn} onChange={v => update(s => { s.equipFilterOn = v })} />
          </div>
        </Rise>
      )}

      {/* Saved Places */}
      {places.length > 0 && (
        <Rise index={1} style={{ marginBottom: 20 }}>
          <div className="gm-micro" style={{ marginBottom: 10 }}>{t('YOUR PLACES')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {places.map(p => {
              const isActive = S.activeEquipId === p.id
              return (
                <div
                  key={p.id}
                  className="card"
                  onClick={() => activate(p.id)}
                  style={{
                    margin: 0,
                    cursor: 'pointer',
                    border: isActive ? '1.5px solid var(--acc)' : '1px solid var(--sep-op)',
                  }}
                >
                  <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 13,
                          background: isActive ? 'color-mix(in srgb, var(--acc) 20%, var(--surface-2))' : 'var(--surface-2)',
                          color: isActive ? 'var(--acc)' : 'var(--label-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                        }}
                      >
                        <Icon name="mapPin" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</span>
                          {isActive && (
                            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--acc)', color: 'var(--acc-ink)' }}>
                              {t('ACTIVE')}
                            </span>
                          )}
                        </div>
                        <div className="dim small" style={{ marginTop: 2 }}>
                          {(p.equipment || []).length} {t('equipment types')}
                          {p.plates?.length ? ` · ${p.plates.length} ${t('plate sizes')}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="row" style={{ gap: 6 }}>
                      <button
                        type="button"
                        className="iconbtn"
                        aria-label={t('Edit')}
                        onClick={e => { e.stopPropagation(); openEditor(p) }}
                      >
                        <Icon name="pencil" style={{ fontSize: 15 }} />
                      </button>
                      <button
                        type="button"
                        className="iconbtn"
                        style={{ color: 'var(--red)' }}
                        aria-label={t('Delete')}
                        onClick={e => { e.stopPropagation(); remove(p) }}
                      >
                        <Icon name="trash" style={{ fontSize: 15 }} />
                      </button>
                    </div>
                  </div>

                  {(p.equipment || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {p.equipment.slice(0, 7).map(eq => (
                        <span
                          key={eq}
                          className="capitalize"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 9px',
                            borderRadius: 999,
                            background: 'var(--surface-2)',
                            color: 'var(--label-2)',
                          }}
                        >
                          {eq}
                        </span>
                      ))}
                      {p.equipment.length > 7 && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--label-3)' }}>
                          +{p.equipment.length - 7}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Rise>
      )}

      {/* Quick Presets */}
      <Rise index={2}>
        <div className="gm-micro" style={{ marginBottom: 10 }}>{t('QUICK PRESETS')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLACE_PRESETS.map(preset => (
            <div key={preset.id} className="card row between" style={{ margin: 0, gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{t(preset.name)}</div>
                <div className="dim small" style={{ marginTop: 2 }}>
                  {preset.equipment.slice(0, 4).join(', ')}{preset.equipment.length > 4 ? ` +${preset.equipment.length - 4}` : ''}
                </div>
              </div>
              <button type="button" className="chip on" onClick={() => addPreset(preset)}>
                <Icon name="plus" style={{ fontSize: 12 }} /> {t('Add')}
              </button>
            </div>
          ))}
        </div>
      </Rise>
    </div>
  )
}
