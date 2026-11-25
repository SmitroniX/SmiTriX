import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { HEAT_TONES } from '../lib/gymmane-awards.js'
import { t } from '../lib/i18n.js'
import { isoOf } from '../lib/format.js'

const WEEKS = 16
const CELL_SIZE = 13
const GAP = 3
const DAYS_MON = ['', 'M', '', 'W', '', 'F', '']
const DAYS_SUN = ['S', '', 'T', '', 'T', '', 'S']

export default function ActivityHeatmap({ workouts = [], weekStart = 1, tone }) {
  const storeTone = useStore(s => s?.S?.heatTone || 'ember')
  const palette = HEAT_TONES[tone || storeTone] || HEAT_TONES.ember

  const { cells, totalWorkouts } = useMemo(() => {
    const counts = {}
    const intensities = {}
    workouts.forEach(w => {
      if (!w.d) return
      counts[w.d] = (counts[w.d] || 0) + 1
      const sets = (w.entries || []).reduce(
        (sum, e) => sum + (e.sets || []).filter(s => s.done).length,
        0
      )
      intensities[w.d] = (intensities[w.d] || 0) + Math.max(1, sets)
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = isoOf(today)

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
        const intensity = isFuture ? 0 : (intensities[iso] || 0)
        if (count > 0) total += count
        const level = count <= 0 ? 0 : intensity >= 24 ? 4 : intensity >= 16 ? 3 : intensity >= 8 ? 2 : 1
        grid.push({ w, d, count, level, iso, isToday: iso === todayISO })
      }
    }

    return { cells: grid, totalWorkouts: total }
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
              fontFamily="Nunito, -apple-system, system-ui, sans-serif"
            >
              {lbl}
            </text>
          ) : null)}

          {cells.map((c, idx) => {
            if (c.count < 0) return null
            const fill = palette.ramp[c.level] || palette.ramp[0]
            return (
              <rect
                key={idx}
                className="gm-hm-cell"
                x={c.w * (CELL_SIZE + GAP) + 20}
                y={c.d * (CELL_SIZE + GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={3.5}
                fill={fill}
                stroke={c.isToday ? 'var(--label)' : 'none'}
                strokeWidth={c.isToday ? 1.2 : 0}
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
          {palette.ramp.map((col, idx) => (
            <div key={idx} style={{ width: 10, height: 10, borderRadius: 2.5, background: col }} />
          ))}
          <span className="dim" style={{ fontSize: 11 }}>{t('More')}</span>
        </div>
      </div>
    </div>
  )
}
