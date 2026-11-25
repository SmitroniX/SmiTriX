// Official GymMane starter templates (10 curated programs using GymMane exercise IDs).
import { uid } from './format.js'
import { GYMMANE_TEMPLATES } from './gymmane-templates.js'

export { GYMMANE_TEMPLATES }

const TEMPLATE_ALIASES = {
  'upper-lower': 'upperlower',
  'full-body': 'fullbody',
  '5x5': 'stronglifts',
}

function findTemplate(id) {
  const key = TEMPLATE_ALIASES[id] || id
  return GYMMANE_TEMPLATES.find(tpl => tpl.id === key) || null
}

function emojiForDay(name = '') {
  const s = name.toLowerCase()
  if (s.includes('leg') || s.includes('lower')) return 'legs'
  if (s.includes('pull') || s.includes('back')) return 'pullup'
  if (s.includes('full') || s.includes('home') || s.includes('recommended')) return 'figureStrength'
  return 'barbell'
}

// Convert a GymMane template into SmiTriX routines + weekly schedule.
// Deduplicates identical day names within a template (e.g., Full Body M/W/F or Arnold Split
// repeating Chest & Back on Mon & Thu) so the routine list stays clean.
function buildFromTemplate(tpl) {
  const byName = new Map()
  const routines = []
  const schedule = []

  tpl.days.forEach((dayDef, idx) => {
    let routine = byName.get(dayDef.name)
    if (!routine) {
      routine = {
        id: uid(),
        name: dayDef.name,
        emoji: emojiForDay(dayDef.name),
        color: routines.length % 6,
        group: tpl.name,
        ex: dayDef.ex.map(([id, sets, reps]) => ({ id, sets, reps, weight: 0 })),
      }
      byName.set(dayDef.name, routine)
      routines.push(routine)
    }
    const weekday = dayDef.weekday % 7 // GymMane uses 1=Mon..6=Sat, 7=Sun → JS 0=Sun..6=Sat
    schedule.push({ day: weekday, routineId: routine.id })
  })

  return { routines, schedule }
}

// Fresh Push / Pull / Legs starter routines using GymMane exercise IDs.
export const starterRoutines = () => buildFromTemplate(findTemplate('ppl')).routines

// Expose core 4 classic aliases (for compact onboarding/sheets) + full 10 templates.
export const starterPlanOptions = () => [
  { id: 'ppl', days: 3 },
  { id: 'upper-lower', days: 4 },
  { id: 'full-body', days: 3 },
  { id: '5x5', days: 2 },
]

export const allProgramOptions = () =>
  GYMMANE_TEMPLATES.map(tpl => ({
    id: tpl.id,
    name: tpl.name,
    days: tpl.days.length,
    scheduleDays: tpl.days.map(d => d.weekday % 7),
    routines: tpl.days,
  }))

export const starterPlanDays = id => {
  const tpl = findTemplate(id)
  return tpl ? tpl.days.map(d => d.weekday % 7) : null
}

export const buildStarterPlan = id => {
  const tpl = findTemplate(id)
  return tpl ? buildFromTemplate(tpl) : null
}
