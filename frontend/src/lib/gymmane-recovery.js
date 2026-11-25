// GymMane Recovery Hub (Sauna, Cold Plunge, Contrast Therapy & Guided Breathing)
import { isoOf, startOfWeek, todayISO, weekStartOf } from './format.js'

export const RECOVERY_KINDS = [
  { id: 'sauna', name: 'Sauna', desc: 'Dry or steam heat exposure', img: './smitrix-ui/img/recovery-sauna.webp', color: '#D9A184', defaultMin: 15, defaultTempC: 85 },
  { id: 'cold', name: 'Cold Plunge', desc: 'Ice bath or cold shower', img: './smitrix-ui/img/recovery-cold.webp', color: '#7FA8C9', defaultMin: 3, defaultTempC: 10 },
  { id: 'contrast', name: 'Contrast', desc: 'Alternate heat and cold rounds', img: './smitrix-ui/img/recovery-contrast.webp', color: '#E0B15A', defaultMin: 12, defaultColdMin: 2 },
  { id: 'breath', name: 'Breathwork', desc: 'Guided nervous system reset', img: './smitrix-ui/img/recovery-lungs.webp', color: '#8FA377', defaultMin: 5 },
]

export const BREATH_PATTERNS = [
  {
    id: 'box',
    name: 'Box Breathing',
    desc: '4-4-4-4 focus & calm',
    phases: [
      { label: 'Inhale', sec: 4, scale: 1.28 },
      { label: 'Hold', sec: 4, scale: 1.28 },
      { label: 'Exhale', sec: 4, scale: 0.78 },
      { label: 'Hold', sec: 4, scale: 0.78 },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Downshift',
    desc: 'Post-workout parasympathetic recovery',
    phases: [
      { label: 'Inhale', sec: 4, scale: 1.3 },
      { label: 'Hold', sec: 7, scale: 1.3 },
      { label: 'Exhale', sec: 8, scale: 0.74 },
    ],
  },
  {
    id: 'coherent',
    name: 'Coherent 5.5s',
    desc: 'Steady HRV balance',
    phases: [
      { label: 'Inhale', sec: 5, scale: 1.26 },
      { label: 'Exhale', sec: 5, scale: 0.8 },
    ],
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    desc: 'Double inhale, long slow release',
    phases: [
      { label: 'Inhale', sec: 2, scale: 1.15 },
      { label: 'Top-up', sec: 1, scale: 1.32 },
      { label: 'Exhale', sec: 6, scale: 0.74 },
    ],
  },
]

export function summarizeRecoveryWeek(S, refIso = todayISO()) {
  const entries = S?.recovery?.entries || []
  const ws = weekStartOf(S)
  const wkStart = startOfWeek(refIso, ws)
  const weekDays = [0, 0, 0, 0, 0, 0, 0]
  let heat = 0
  let cold = 0
  let breath = 0
  let sessions = 0
  let bestColdSec = 0
  let bestHoldSec = 0

  for (const e of entries) {
    if (e.kind === 'cold' && (e.sec || 0) > bestColdSec) bestColdSec = e.sec
    if (e.kind === 'contrast' && (e.coldSec || 0) > bestColdSec) bestColdSec = e.coldSec
    if ((e.bestHold || 0) > bestHoldSec) bestHoldSec = e.bestHold

    if (!e.d) continue
    const dayDate = new Date(e.d + 'T12:00:00')
    const diff = Math.round((dayDate - wkStart) / 86400000)
    if (diff >= 0 && diff < 7) {
      sessions++
      const totalSec = (e.sec || 0) + (e.coldSec || 0)
      weekDays[diff] += totalSec
      if (e.kind === 'sauna') heat += e.sec || 0
      else if (e.kind === 'cold') cold += e.sec || 0
      else if (e.kind === 'contrast') {
        heat += (e.sec || 0) * Math.max(1, e.rounds || 1)
        cold += (e.coldSec || 0) * Math.max(1, e.rounds || 1)
      } else if (e.kind === 'breath') {
        breath += e.sec || 0
      }
    }
  }

  return { heat, cold, breath, sessions, weekDays, bestColdSec, bestHoldSec, weekStartIso: isoOf(wkStart) }
}
