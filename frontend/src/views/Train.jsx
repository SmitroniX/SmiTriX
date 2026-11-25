import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { allExercises, matchExercise, equipmentOf } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { musclesOf, MUSCLE_NAME } from '../lib/muscles.js'
import { buildSets, freestyleConfig } from '../lib/history.js'
import { todayISO, uid } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import BodyMap from '../components/BodyMap.jsx'
import { Thumb } from '../components/Media.jsx'
import { Rise } from '../components/GymManeMotion.jsx'
import { customExSheet, exerciseDetailSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'

// GymMane 2-Step Interactive Body Map Focus Picker (train_screen.dart)
export default function Train() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const initialKind = params.get('kind') || null

  const [step, setStep] = useState(initialKind ? 'review' : 'select')
  const [kind, setKind] = useState(initialKind) // null | 'warmup' | 'cardio'
  const [selectedMuscles, setSelectedMuscles] = useState([])
  const [pickedIds, setPickedIds] = useState([])
  const [seedIds, setSeedIds] = useState([])
  const [q, setQ] = useState('')
  const [eqFilter, setEqFilter] = useState('')

  const profile = activeProfile(S)

  const toggleMuscle = slug => {
    setSelectedMuscles(prev =>
      prev.includes(slug) ? prev.filter(m => m !== slug) : [...prev, slug]
    )
  }

  const bodyLoad = useMemo(() => {
    const map = {}
    for (const m of selectedMuscles) map[m] = 1
    return map
  }, [selectedMuscles])

  const all = useMemo(() => {
    const list = allExercises(S)
    return profile ? list.filter(e => exAvailable(S, e)) : list
  }, [S, profile])

  const reviewPool = useMemo(() => {
    if (q.trim()) return all.filter(e => matchExercise(e, q))
    if (kind === 'cardio') {
      return all.filter(e => (e.bp || '').toLowerCase() === 'cardio' || (e.name || '').toLowerCase().includes('run') || (e.name || '').toLowerCase().includes('jump'))
    }
    if (kind === 'warmup') {
      return all.filter(e => (e.eq || '').includes('body') || (e.name || '').toLowerCase().includes('stretch') || (e.name || '').toLowerCase().includes('circle'))
    }
    if (!selectedMuscles.length) return all.slice(0, 60)
    const set = new Set(selectedMuscles)
    return all.filter(e => {
      const m = musclesOf(e)
      return Object.keys(m).some(slug => set.has(slug))
    })
  }, [all, q, kind, selectedMuscles])

  const eqOptions = useMemo(() => equipmentOf(reviewPool).slice(0, 10), [reviewPool])
  const filteredPool = eqFilter ? reviewPool.filter(e => e.eq === eqFilter) : reviewPool

  const buildSuggested = (muscles, specialKind = null) => {
    const pool = specialKind === 'cardio'
      ? all.filter(e => (e.bp || '').toLowerCase() === 'cardio')
      : specialKind === 'warmup'
        ? all.filter(e => (e.eq || '').includes('body'))
        : all.filter(e => Object.keys(musclesOf(e)).some(slug => muscles.includes(slug)))

    // Pick balanced 4-6 exercises covering chosen muscles
    const chosen = []
    if (!specialKind && muscles.length) {
      for (const m of muscles) {
        const matches = pool.filter(e => {
          const mm = musclesOf(e)
          return (mm[m] || 0) >= 0.8 && !chosen.includes(e.id)
        })
        for (const ex of matches.slice(0, muscles.length <= 2 ? 3 : 2)) {
          chosen.push(ex.id)
        }
      }
    } else {
      for (const ex of pool.slice(0, 4)) chosen.push(ex.id)
    }
    setSeedIds(chosen)
    setPickedIds(chosen)
  }

  const goReview = () => {
    if (!selectedMuscles.length) return
    setKind(null)
    buildSuggested(selectedMuscles)
    setStep('review')
  }

  const goKind = k => {
    setKind(k)
    setSelectedMuscles([])
    buildSuggested([], k)
    setStep('review')
  }

  const togglePick = id => {
    setPickedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const launchSession = () => {
    if (!pickedIds.length) return
    const title = kind === 'cardio'
      ? t('Cardio Session')
      : kind === 'warmup'
        ? t('Warm-up & Mobility')
        : selectedMuscles.slice(0, 3).map(m => MUSCLE_NAME[m] || m).join(' & ') || t('Custom Focus')

    const entries = pickedIds.map(id => {
      const cfg = freestyleConfig(S, id)
      return {
        id,
        target: cfg,
        sets: buildSets(S, cfg),
      }
    })

    const begin = () => {
      update(s => {
        s.active = {
          id: uid(),
          name: title,
          d: todayISO(),
          start: Date.now(),
          idx: 0,
          entries,
          focusMuscles: selectedMuscles,
        }
      })
      nav('/workout')
    }

    const cd = Number(S.startCountdownSec) || 0
    if (cd > 0) {
      const firstEx = all.find(x => x.id === pickedIds[0])
      useUI.getState().openCountdown(cd, firstEx ? exerciseNameFor(firstEx) : title, begin)
    } else {
      begin()
    }
  }

  return (
    <div className="narrow" style={{ paddingBottom: step === 'review' ? 96 : 24 }}>
      {/* Top Bar */}
      <div className="row between" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className="iconbtn"
          aria-label={t('Close')}
          onClick={() => (step === 'review' && !initialKind ? setStep('select') : nav('/home'))}
        >
          <Icon name={step === 'review' ? 'chevronLeft' : 'xmark'} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{t('Train')}</div>
        <div style={{ width: 38 }} />
      </div>

      {step === 'select' ? (
        <Rise index={0}>
          <div className="gm-micro" style={{ marginBottom: 4 }}>{t('STEP 1 OF 2')}</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
            {t('CHOOSE YOUR FOCUS')}
          </h1>

          {/* Interactive Front & Back Body Map Card */}
          <div
            className="card"
            style={{
              padding: '16px 12px',
              borderRadius: 24,
              background: 'var(--surface)',
              marginBottom: 8,
            }}
          >
            <BodyMap
              className="tappable gm-train-bodymap"
              load={bodyLoad}
              body={S.body}
              selected={null}
              onMuscle={toggleMuscle}
              thresholds={[{ at: 0.5, level: 4 }]}
            />
          </div>
          <div className="dim small" style={{ textAlign: 'center', marginBottom: 14, fontWeight: 600 }}>
            {t('Tap the muscles you want to train, front and back.')}
          </div>

          {/* Selected Muscle Chips */}
          <div style={{ minHeight: 38, display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {selectedMuscles.map(slug => (
              <button
                key={slug}
                type="button"
                onClick={() => toggleMuscle(slug)}
                style={{
                  padding: '8px 13px',
                  borderRadius: 999,
                  background: 'var(--ember-soft)',
                  color: 'var(--ember)',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{t(MUSCLE_NAME[slug] || slug)}</span>
                <Icon name="xmark" style={{ fontSize: 12 }} />
              </button>
            ))}
          </div>

          {/* Continue Button */}
          <button
            type="button"
            className={'btn' + (selectedMuscles.length ? ' primary' : '')}
            disabled={!selectedMuscles.length}
            style={{ minHeight: 54, fontSize: 16, marginBottom: 26 }}
            onClick={goReview}
          >
            {t('Continue')}
          </button>

          {/* OR START WITH: Warm-up / Cardio */}
          <div className="gm-micro" style={{ marginBottom: 10 }}>{t('OR START WITH')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="card tappable" style={{ margin: 0, cursor: 'pointer', padding: 16 }} onClick={() => goKind('warmup')}>
              <span style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--acc-soft)', color: 'var(--acc)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon name="flame" />
              </span>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>{t('Warm-up')}</div>
              <div className="muted small" style={{ fontSize: 12, lineHeight: 1.35 }}>
                {t('Mobility and activation, with or without kit')}
              </div>
            </div>
            <div className="card tappable" style={{ margin: 0, cursor: 'pointer', padding: 16 }} onClick={() => goKind('cardio')}>
              <span style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--acc-soft)', color: 'var(--acc)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon name="heart" />
              </span>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>{t('Cardio')}</div>
              <div className="muted small" style={{ fontSize: 12, lineHeight: 1.35 }}>
                {t('Run, bike, row or skip, by distance and time')}
              </div>
            </div>
          </div>
        </Rise>
      ) : (
        <Rise index={0}>
          <div className="gm-micro" style={{ marginBottom: 4 }}>{t('STEP 2 OF 2')}</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 14 }}>
            {t('Build session')}
          </h1>

          {/* Search + Reset + Create */}
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <div className="search" style={{ flex: 1, margin: 0 }}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input
                className="input"
                placeholder={t('Search all exercises')}
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{ borderRadius: 999 }}
              />
            </div>
            <button
              type="button"
              className="iconbtn"
              style={{ borderRadius: 14, width: 44, height: 44 }}
              title={t('Clear selection')}
              onClick={() => setPickedIds([])}
            >
              <Icon name="reset" />
            </button>
            <button
              type="button"
              className="iconbtn"
              style={{ borderRadius: 14, width: 44, height: 44, background: 'var(--ember-soft)' }}
              title={t('Create exercise')}
              onClick={() => customExSheet(null, ex => { if (ex?.id) togglePick(ex.id) }, q)}
            >
              <Icon name="plus" />
            </button>
          </div>

          {/* Equipment Filter Chips */}
          {eqOptions.length > 1 && (
            <div className="chips" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14 }}>
              <button type="button" className={'chip' + (!eqFilter ? ' on' : '')} onClick={() => setEqFilter('')}>
                {t('All')}
              </button>
              {eqOptions.map(eq => (
                <button key={eq} type="button" className={'chip' + (eqFilter === eq ? ' on' : '')} onClick={() => setEqFilter(eqFilter === eq ? '' : eq)}>
                  {t(eq)}
                </button>
              ))}
            </div>
          )}

          {/* Suggested Picks */}
          {!q && seedIds.length > 0 && (
            <div className="gm-micro" style={{ marginBottom: 8 }}>{t('SUGGESTED PICKS')}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {filteredPool.slice(0, 60).map(ex => {
              const picked = pickedIds.includes(ex.id)
              return (
                <div
                  key={ex.id}
                  onClick={() => togglePick(ex.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    borderRadius: 18,
                    background: 'var(--surface)',
                    border: picked ? '1.5px solid var(--ember)' : '1px solid color-mix(in srgb, var(--sep) 38%, transparent)',
                    cursor: 'pointer',
                    transition: 'border-color 150ms, transform 140ms',
                  }}
                >
                  <Thumb ex={ex} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="capitalize" style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exerciseNameFor(ex)}
                    </div>
                    <div className="dim small capitalize" style={{ fontSize: 12 }}>
                      {t(ex.eq || 'body weight')} · {t(ex.tg || ex.bp || '')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="iconbtn"
                    style={{ width: 30, height: 30, fontSize: 14 }}
                    onClick={e => { e.stopPropagation(); exerciseDetailSheet(ex) }}
                    aria-label={t('Exercise info')}
                  >
                    <Icon name="info" />
                  </button>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: picked ? 'var(--ember)' : 'transparent',
                      border: picked ? 'none' : '1.5px solid var(--label-3)',
                      color: 'var(--on-ember)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    {picked && <Icon name="check" style={{ fontSize: 14, '--icon-stroke': 2.6 }} />}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Sticky Bottom Launch Bar */}
          <div
            style={{
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 'calc(94px + var(--sab))',
              width: 'min(calc(100vw - 36px), 440px)',
              zIndex: 48,
            }}
          >
            <button
              type="button"
              className="btn primary"
              disabled={!pickedIds.length}
              style={{ minHeight: 54, fontSize: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.55)' }}
              onClick={launchSession}
            >
              <Icon name="playFill" style={{ fontSize: 14 }} />
              <span>
                {pickedIds.length
                  ? t('Start workout ({0})', pickedIds.length)
                  : t('Pick an exercise')}
              </span>
            </button>
          </div>
        </Rise>
      )}
    </div>
  )
}
