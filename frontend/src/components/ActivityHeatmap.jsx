import { useMemo } from 'react'
import { t } from '../lib/i18n.js'
import { isoOf } from '../lib/format.js'

const WEEKS = 16
const CELL_SIZE = 13
const GAP = 3
const DAYS_MON = ['', 'M', '', 'W', '', 'F', '']
const DAYS_SUN = ['S', '', 'T', '', 'T', '', 'S']

export default function ActivityHeatmap({ workouts = [], weekStart = 1 }) {
  const { cells, totalWorkouts, currentStreak } = useMemo(() => {
    const counts = {}
    workouts.forEach(w => {
      if (w.d) counts[w.d] = (counts[w.d] || 0) + 1
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = isoOf(today)

    // Calculate start date WEEKS ago, aligned to weekStart
    const dayOfWeek = (today.getDay() - weekStart + 7) % 7
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - (WEEKS - 1) * 7 - dayOfWeek)

    const grid = []
    let total = 0

    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate)
        cellDate.setDate(startDate.getDate() + w * 7 + d)
        const iso = isoOf(cellDate)
        const isFuture = cellDate > today
        const count = isFuture ? -1 : (counts[iso] || 0)
        if (count > 0) total += count
        grid.push({ w, d, count, iso, isToday: iso === todayISO })
      }
    }

    // Current daily streak
    let streak = 0
    let checkDate = new Date(today)
    if (!counts[todayISO]) {
      // Check yesterday if haven't worked out today yet
      checkDate.setDate(checkDate.getDate() - 1)
    }
    while (counts[isoOf(checkDate)]) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return { cells: grid, totalWorkouts: total, currentStreak: streak }
  }, [workouts, weekStart])

  const W = WEEKS * (CELL_SIZE + GAP) + 24
  const H = 7 * (CELL_SIZE + GAP) + 4
  const dayLabels = weekStart === 1 ? DAYS_MON : DAYS_SUN

  return (
    <div className="activity-heatmap" style={{ marginTop: 4 }}>
      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 260, display: 'block' }}>
          {dayLabels.map((lbl, i) => lbl ? (
            <text
              key={i}
              x={0}
              y={i * (CELL_SIZE + GAP) + CELL_SIZE - 2}
              fontSize={9}
              fill="var(--label-3)"
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              {lbl}
            </text>
          ) : null)}

          {cells.map((c, idx) => {
            if (c.count < 0) return null
            const fill = c.count === 0
              ? 'var(--surface-2)'
              : c.count === 1
                ? 'var(--acc-line)'
                : 'var(--acc)'
            const opacity = c.count === 0 ? 0.45 : c.count === 1 ? 0.85 : 1
            return (
              <rect
                key={idx}
                x={c.w * (CELL_SIZE + GAP) + 20}
                y={c.d * (CELL_SIZE + GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={3}
                fill={fill}
                stroke={c.isToday ? 'var(--label)' : 'none'}
                strokeWidth={c.isToday ? 1 : 0}
                style={{ opacity, transition: 'opacity 150ms' }}
              >
                <title>{`${c.iso}: ${c.count} ${c.count === 1 ? 'workout' : 'workouts'}`}</title>
              </rect>
            )
          })}
        </svg>
      </div>

      <div className="row between" style={{ marginTop: 8, fontSize: 12 }}>
        <span className="dim">
          {t('{0} workouts in last {1} weeks', totalWorkouts, WEEKS)}
        </span>
        <div className="row" style={{ gap: 4, alignItems: 'center' }}>
          <span className="dim" style={{ fontSize: 11 }}>{t('Less')}</span>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--surface-2)', opacity: 0.45 }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--acc-line)', opacity: 0.85 }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--acc)', opacity: 1 }} />
          <span className="dim" style={{ fontSize: 11 }}>{t('More')}</span>
        </div>
      </div>
    </div>
  )
}
