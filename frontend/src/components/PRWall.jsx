import { useMemo } from 'react'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor, t } from '../lib/i18n.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import Icon from './Icon.jsx'

// Multipliers of bodyweight: [Beginner, Novice, Intermediate, Advanced, Elite]
const STANDARDS = {
  'bench':    [0.5, 0.75, 1.0, 1.25, 1.5],
  'squat':    [0.75, 1.0, 1.25, 1.75, 2.25],
  'deadlift': [1.0, 1.25, 1.5, 2.0, 2.5],
  'overhead': [0.35, 0.5, 0.65, 0.85, 1.0],
  'press':    [0.4, 0.6, 0.8, 1.0, 1.2],
  'row':      [0.5, 0.65, 0.85, 1.1, 1.3],
}

const LEVEL_NAMES = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite']
const LEVEL_COLORS = ['var(--grey)', 'var(--blue)', 'var(--green)', 'var(--orange)', 'var(--yellow)']

function getStrengthLevel(exName, weight, bw) {
  if (!bw || bw <= 0 || !weight || weight <= 0) return null
  const ratio = weight / bw
  const lower = (exName || '').toLowerCase()
  let std = null
  for (const [key, multipliers] of Object.entries(STANDARDS)) {
    if (lower.includes(key)) {
      std = multipliers
      break
    }
  }
  if (!std) return null

  let levelIdx = 0
  for (let i = std.length - 1; i >= 0; i--) {
    if (ratio >= std[i]) {
      levelIdx = i
      break
    }
  }

  return {
    ratio,
    levelName: LEVEL_NAMES[levelIdx],
    color: LEVEL_COLORS[levelIdx],
  }
}

export default function PRWall({ exWeights = {}, bw = null, unit = 'kg' }) {
  const prList = useMemo(() => {
    return Object.entries(exWeights)
      .map(([id, item]) => {
        const ex = EXIDX[id] || { id, name: id }
        const name = exerciseNameFor(ex)
        const w = Number(item.w) || 0
        const d = item.d
        const level = getStrengthLevel(name, w, bw)
        return { id, name, w, d, level }
      })
      .filter(item => item.w > 0)
      .sort((a, b) => b.w - a.w)
  }, [exWeights, bw])

  if (!prList.length) {
    return (
      <div className="muted small" style={{ textAlign: 'center', padding: '12px 0' }}>
        {t('No personal records logged yet. Finish a workout with weights to fill your Wall of Fame!')}
      </div>
    )
  }

  return (
    <div className="pr-wall">
      <div className="pr-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {prList.slice(0, 8).map(pr => (
          <div
            key={pr.id}
            className="row between"
            style={{
              padding: '8px 12px',
              background: 'var(--surface-2)',
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="capitalize" style={{ fontWeight: 600, fontSize: 14, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {pr.name}
              </div>
              <div className="row" style={{ gap: 6, alignItems: 'center', marginTop: 3 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--acc)' }}>
                  {fmtNum(pr.w)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--label-2)' }}>{unit}</span>
                </span>
                {pr.level && (
                  <span
                    className="tag"
                    style={{
                      color: pr.level.color,
                      background: `color-mix(in srgb, ${pr.level.color} 14%, transparent)`,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                    }}
                  >
                    {t(pr.level.levelName)} · {fmtNum(pr.level.ratio, 1)}× BW
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right', flex: 'none', marginLeft: 8 }}>
              <Icon name="trophy" style={{ color: 'var(--yellow)', fontSize: 16 }} />
              {pr.d && <div className="dim" style={{ fontSize: 10, marginTop: 2 }}>{fmtDate(pr.d)}</div>}
            </div>
          </div>
        ))}
      </div>

      {bw && bw > 0 && (
        <div className="dim small" style={{ textAlign: 'right', marginTop: 8, fontSize: 11 }}>
          {t('Standards calculated for {0} {1} body weight', fmtNum(bw), unit)}
        </div>
      )}
    </div>
  )
}
