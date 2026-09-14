import { useMemo, useState } from 'react'
import BodyMap from './BodyMap.jsx'
import { fatigueOf, FATIGUE_STATES } from '../lib/recovery.js'
import { FATIGUE_LEVELS } from '../views/Stats.jsx'
import { MUSCLES, MUSCLE_NAME } from '../lib/muscles.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function RecoveryMap({ workouts = [], body = 'male' }) {
  const [selectedMuscle, setSelectedMuscle] = useState(null)

  const { fatigue, muscleStatus } = useMemo(() => {
    const fat = fatigueOf(workouts, Date.now())
    const status = { ready: [], recovering: [], fatigued: [] }

    MUSCLES.forEach(slug => {
      const val = fat[slug] || 0
      if (val >= 0.4) status.fatigued.push(slug)
      else if (val >= 0.15) status.recovering.push(slug)
      else status.ready.push(slug)
    })

    return { fatigue: fat, muscleStatus: status }
  }, [workouts])

  return (
    <div className="recovery-map-card">
      <div style={{ textAlign: 'center' }}>
        <BodyMap
          className="tappable hm-fatigue"
          load={fatigue}
          thresholds={FATIGUE_LEVELS}
          body={body}
          selected={selectedMuscle}
          onMuscle={slug => setSelectedMuscle(curr => curr === slug ? null : slug)}
        />
      </div>

      {/* Selected Muscle Inspector */}
      {selectedMuscle && (
        <div className="row between" style={{
          background: 'var(--surface-2)',
          padding: '8px 12px',
          borderRadius: 8,
          margin: '8px 0',
          fontSize: 13,
        }}>
          <span style={{ fontWeight: 600 }}>{t(MUSCLE_NAME[selectedMuscle] || selectedMuscle)}</span>
          <span style={{
            color: (fatigue[selectedMuscle] || 0) >= 0.4
              ? 'var(--red)'
              : (fatigue[selectedMuscle] || 0) >= 0.15
                ? 'var(--orange)'
                : 'var(--green)'
          }}>
            {(fatigue[selectedMuscle] || 0) >= 0.4
              ? t('Recovering (rest needed)')
              : (fatigue[selectedMuscle] || 0) >= 0.15
                ? t('Rebuilding')
                : t('Ready to train')}
          </span>
        </div>
      )}

      {/* Status Legend */}
      <div className="row between" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 5, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)' }} />
          <span className="dim" style={{ fontSize: 11 }}>{t('Fatigued')} ({muscleStatus.fatigued.length})</span>
        </div>
        <div className="row" style={{ gap: 5, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--orange)' }} />
          <span className="dim" style={{ fontSize: 11 }}>{t('Rebuilding')} ({muscleStatus.recovering.length})</span>
        </div>
        <div className="row" style={{ gap: 5, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }} />
          <span className="dim" style={{ fontSize: 11 }}>{t('Ready')} ({muscleStatus.ready.length})</span>
        </div>
      </div>
    </div>
  )
}
