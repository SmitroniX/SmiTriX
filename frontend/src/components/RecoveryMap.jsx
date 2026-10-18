import { useMemo, useState } from 'react'
import BodyMap from './BodyMap.jsx'
import { FATIGUE_STATES } from '../lib/recovery.js'
import { FATIGUE_LEVELS } from '../views/Stats.jsx'
import { MUSCLE_NAME } from '../lib/muscles.js'
import { calculateReadinessIndex, READINESS_CATEGORIES } from '../lib/readiness.js'
import { t } from '../lib/i18n.js'

export default function RecoveryMap({ workouts = [], body = 'male', unit = 'kg', bodyweightKg = null }) {
  const [selectedMuscle, setSelectedMuscle] = useState(null)
  const [showRegions, setShowRegions] = useState(false)

  const readinessData = useMemo(() => {
    return calculateReadinessIndex(workouts, Date.now(), { unit, bodyweightKg })
  }, [workouts, unit, bodyweightKg])

  const {
    overallScore,
    category,
    muscles,
    muscleMap,
    readyMuscles,
    recoveringMuscles,
    fatiguedMuscles,
    freshRecommendations,
    focusRecovery,
    regions,
    totalSets30d,
    workoutCount30d,
  } = readinessData

  const fatigueMap = useMemo(() => {
    return Object.fromEntries((muscles || []).map(m => [m.slug, m.fatigue]))
  }, [muscles])

  const selected = selectedMuscle ? muscleMap[selectedMuscle] : null

  const categoryColor =
    category === READINESS_CATEGORIES.OPTIMAL
      ? 'var(--green)'
      : category === READINESS_CATEGORIES.GOOD
        ? 'var(--blue)'
        : category === READINESS_CATEGORIES.MODERATE
          ? 'var(--orange)'
          : 'var(--red)'

  return (
    <div className="recovery-map-card">
      {/* Overall Readiness Header */}
      <div className="row between" style={{
        background: 'var(--surface-2)',
        padding: '10px 14px',
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }} className="dim">
            {t('Readiness Index')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: categoryColor }}>
              {overallScore}%
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 99,
              background: `color-mix(in srgb, ${categoryColor} 18%, transparent)`,
              color: categoryColor,
              textTransform: 'capitalize',
            }}>
              {t(category)}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11 }} className="dim">
          <div>{t('{0} work sets (30d)', totalSets30d)}</div>
          <div>{t('{0} sessions', workoutCount30d)}</div>
        </div>
      </div>

      {/* Interactive Body Heatmap */}
      <div style={{ textAlign: 'center' }}>
        <BodyMap
          className="tappable hm-fatigue"
          load={fatigueMap}
          thresholds={FATIGUE_LEVELS}
          body={body}
          selected={selectedMuscle}
          onMuscle={slug => setSelectedMuscle(curr => curr === slug ? null : slug)}
        />
      </div>

      {/* Selected Muscle Inspector */}
      {selected && (
        <div style={{
          background: 'var(--surface-2)',
          padding: '10px 12px',
          borderRadius: 8,
          margin: '10px 0',
          fontSize: 13,
        }}>
          <div className="row between" style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{t(selected.name || MUSCLE_NAME[selectedMuscle] || selectedMuscle)}</span>
            <span style={{
              fontWeight: 600,
              color: selected.state === FATIGUE_STATES.FATIGUED
                ? 'var(--red)'
                : selected.state === FATIGUE_STATES.RECOVERING
                  ? 'var(--orange)'
                  : 'var(--green)',
            }}>
              {selected.state === FATIGUE_STATES.FATIGUED
                ? t('Fatigued')
                : selected.state === FATIGUE_STATES.RECOVERING
                  ? t('Rebuilding')
                  : t('Ready')}
            </span>
          </div>
          <div className="row between dim" style={{ fontSize: 12, marginTop: 4 }}>
            <span>{t('Readiness: {0}%', selected.readiness)}</span>
            <span>
              {selected.hoursToRecover > 0
                ? t('~{0}h recovery needed', selected.hoursToRecover)
                : t('Ready to train')}
            </span>
          </div>
          <div className="row between dim" style={{ fontSize: 11, marginTop: 4 }}>
            <span>{t('{0} sets (30d)', selected.sets30d)}</span>
            <span>
              {selected.daysSinceTrained != null
                ? (selected.daysSinceTrained === 0 ? t('Trained today') : t('Trained {0}d ago', selected.daysSinceTrained))
                : t('Not trained recently')}
            </span>
          </div>
        </div>
      )}

      {/* Fresh Training Recommendations */}
      {freshRecommendations.length > 0 && (
        <div style={{ margin: '8px 0 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }} className="dim">
            {t('Recommended to train next:')}
          </div>
          <div className="mchips">
            {freshRecommendations.map(m => (
              <button
                key={m.slug}
                type="button"
                className={`mchip ${selectedMuscle === m.slug ? 'active' : ''}`}
                style={{
                  cursor: 'pointer',
                  border: selectedMuscle === m.slug ? '1px solid var(--acc)' : '1px solid transparent',
                  background: selectedMuscle === m.slug ? 'var(--surface-3)' : undefined,
                }}
                onClick={() => setSelectedMuscle(curr => curr === m.slug ? null : m.slug)}
              >
                {t(m.name)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Focus Recovery (if any fatigued or recovering muscles needing rest) */}
      {focusRecovery.length > 0 && (
        <div style={{ margin: '8px 0 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--orange)' }}>
            {t('Needs recovery:')}
          </div>
          <div className="mchips">
            {focusRecovery.map(m => (
              <button
                key={m.slug}
                type="button"
                className="mchip miss"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedMuscle(curr => curr === m.slug ? null : m.slug)}
              >
                {t(m.name)} (~{m.hoursToRecover}h)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Regional Breakdown Collapsible */}
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          className="dim"
          style={{
            background: 'none',
            border: 'none',
            width: '100%',
            textAlign: 'center',
            padding: '4px 0',
            fontSize: 11,
            cursor: 'pointer',
          }}
          onClick={() => setShowRegions(v => !v)}
        >
          {showRegions ? t('Hide regional breakdown') : t('Show regional breakdown')}
        </button>
        {showRegions && (
          <div style={{
            marginTop: 6,
            background: 'var(--surface-2)',
            borderRadius: 8,
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            {regions.map(r => (
              <div key={r.id} className="row between" style={{ fontSize: 12, padding: '2px 0' }}>
                <span>{t(r.name)}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="dim" style={{ fontSize: 11 }}>{r.sets30d} sets</span>
                  <span style={{
                    fontWeight: 600,
                    fontSize: 11,
                    color: r.readiness >= 80 ? 'var(--green)' : r.readiness >= 50 ? 'var(--orange)' : 'var(--red)',
                  }}>
                    {r.readiness}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="row between" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 5, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)' }} />
          <span className="dim" style={{ fontSize: 11 }}>{t('Fatigued')} ({fatiguedMuscles.length})</span>
        </div>
        <div className="row" style={{ gap: 5, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--orange)' }} />
          <span className="dim" style={{ fontSize: 11 }}>{t('Rebuilding')} ({recoveringMuscles.length})</span>
        </div>
        <div className="row" style={{ gap: 5, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }} />
          <span className="dim" style={{ fontSize: 11 }}>{t('Ready')} ({readyMuscles.length})</span>
        </div>
      </div>
    </div>
  )
}
