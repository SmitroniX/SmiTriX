import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { musclesOf, MUSCLE_NAME } from '../lib/muscles.js'
import { EXIDX } from '../lib/exercises.js'
import { isWarmupRow } from '../lib/workout-model.js'
import { t } from '../lib/i18n.js'

// GymMane 12-axis Muscle Radar (muscle_radar.dart)
const AXES = [
  { id: 'chest', label: 'Chest', slugs: ['chest'] },
  { id: 'delts', label: 'Shoulders', slugs: ['delts'] },
  { id: 'traps', label: 'Traps', slugs: ['traps'] },
  { id: 'back', label: 'Back', slugs: ['lats', 'upper-back', 'lower-back'] },
  { id: 'triceps', label: 'Triceps', slugs: ['triceps'] },
  { id: 'biceps', label: 'Biceps', slugs: ['biceps'] },
  { id: 'forearms', label: 'Forearms', slugs: ['forearms'] },
  { id: 'abs', label: 'Core', slugs: ['abs', 'obliques'] },
  { id: 'quads', label: 'Quads', slugs: ['quads'] },
  { id: 'calves', label: 'Calves', slugs: ['calves'] },
  { id: 'hamstrings', label: 'Hamstrings', slugs: ['hamstrings'] },
  { id: 'glutes', label: 'Glutes', slugs: ['glutes', 'adductors'] },
]

export default function MuscleRadar({ days = 30 }) {
  const workouts = useStore(s => s.S?.workouts || [])
  const [picked, setPicked] = useState(null)

  const { counts, maxVal, behind } = useMemo(() => {
    const cutoff = Date.now() - days * 86400000
    const raw = {}
    for (const w of workouts) {
      const ts = Number(w.start || (w.d ? new Date(w.d + 'T12:00:00').getTime() : 0))
      if (days > 0 && ts < cutoff) continue
      for (const e of w.entries || []) {
        const doneSets = (e.sets || []).filter(s => s.done && !isWarmupRow(s)).length
        if (!doneSets) continue
        const ex = EXIDX[e.id] || e
        for (const [slug, wt] of Object.entries(musclesOf(ex))) {
          raw[slug] = (raw[slug] || 0) + wt * doneSets
        }
      }
    }
    const counts = {}
    let maxVal = 0
    for (const ax of AXES) {
      const v = ax.slugs.reduce((sum, sl) => sum + (raw[sl] || 0), 0)
      counts[ax.id] = Math.round(v * 10) / 10
      if (v > maxVal) maxVal = v
    }
    const behind = AXES
      .filter(ax => maxVal > 0 && counts[ax.id] < maxVal * 0.45)
      .sort((a, b) => counts[a.id] - counts[b.id])
      .slice(0, 3)
    return { counts, maxVal, behind }
  }, [workouts, days])

  const cx = 160
  const cy = 160
  const R = 104
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const poly = AXES.map((ax, i) => {
    const frac = maxVal > 0 ? Math.max(0.06, counts[ax.id] / maxVal) : 0
    return pt(i, R * frac).join(',')
  }).join(' ')

  const pickedAxis = AXES.find(a => a.id === picked)

  return (
    <div className="card">
      <div className="gm-micro" style={{ marginBottom: 4 }}>{t('MUSCLE RADAR · {0}D', days)}</div>
      <div className="muted small" style={{ marginBottom: 10 }}>
        {t('Tap any muscle point to see effective working sets')}
      </div>
      <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}>
        {/* Concentric grid polygons */}
        {[0.25, 0.5, 0.75, 1].map(ring => (
          <polygon
            key={ring}
            points={AXES.map((_, i) => pt(i, R * ring).join(',')).join(' ')}
            fill="none"
            stroke="color-mix(in srgb, var(--sep) 55%, transparent)"
            strokeWidth="1"
          />
        ))}
        {/* Spokes */}
        {AXES.map((ax, i) => {
          const [x, y] = pt(i, R)
          return <line key={ax.id} x1={cx} y1={cy} x2={x} y2={y} stroke="color-mix(in srgb, var(--sep) 45%, transparent)" strokeWidth="1" />
        })}
        {/* Data polygon */}
        {maxVal > 0 && (
          <polygon
            points={poly}
            fill="color-mix(in srgb, var(--acc) 26%, transparent)"
            stroke="var(--acc)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            style={{ transition: 'all 480ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}
        {/* Vertices + labels */}
        {AXES.map((ax, i) => {
          const frac = maxVal > 0 ? Math.max(0.06, counts[ax.id] / maxVal) : 0
          const [px, py] = pt(i, R * frac)
          const [lx, ly] = pt(i, R + 24)
          const isOn = picked === ax.id
          return (
            <g key={ax.id} style={{ cursor: 'pointer' }} onClick={() => setPicked(isOn ? null : ax.id)}>
              {maxVal > 0 && (
                <circle cx={px} cy={py} r={isOn ? 5.5 : 3.2} fill={isOn ? 'var(--label)' : 'var(--acc)'} />
              )}
              <text
                x={lx}
                y={ly + 3}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isOn ? '900' : '700'}
                fill={isOn ? 'var(--label)' : 'var(--label-2)'}
              >
                {t(ax.label)}
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: pickedAxis ? 'var(--label)' : 'var(--label-2)', marginTop: 6 }}>
        {pickedAxis
          ? `${t(pickedAxis.label)} · ${Math.round(counts[pickedAxis.id])} ${t('sets')}`
          : maxVal <= 0
            ? t('Log workouts to see your balance radar')
            : behind.length === 0
              ? t('Well-balanced across all 12 muscle groups!')
              : t('Room to grow: {0}', behind.map(b => t(b.label)).join(', '))}
      </div>
    </div>
  )
}
