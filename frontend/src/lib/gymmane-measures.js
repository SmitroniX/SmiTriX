// GymMane 10 Body Measurements, Rotation Schedules, Places Presets & Offline AI Plan Import/Export

export const MEASURE_KEYS = [
  { key: 'neck', name: 'Neck', unit: 'cm', min: 25, max: 60, def: 38 },
  { key: 'shoulders', name: 'Shoulders', unit: 'cm', min: 80, max: 165, def: 118 },
  { key: 'chest', name: 'Chest', unit: 'cm', min: 65, max: 155, def: 100 },
  { key: 'waist', name: 'Waist', unit: 'cm', min: 50, max: 150, def: 82 },
  { key: 'hips', name: 'Hips', unit: 'cm', min: 65, max: 155, def: 96 },
  { key: 'bicep', name: 'Biceps', unit: 'cm', sided: true, min: 20, max: 65, def: 36 },
  { key: 'forearm', name: 'Forearms', unit: 'cm', sided: true, min: 18, max: 50, def: 29 },
  { key: 'thigh', name: 'Thighs', unit: 'cm', sided: true, min: 35, max: 95, def: 58 },
  { key: 'calf', name: 'Calves', unit: 'cm', sided: true, min: 24, max: 60, def: 37 },
  { key: 'bodyfat', name: 'Body Fat', unit: '%', min: 4, max: 50, def: 15 },
]

export function measureSeriesFor(measures = [], key) {
  return measures
    .filter(m => m.key === key)
    .sort((a, b) => (a.t || 0) - (b.t || 0))
}

export function measureDeltaFor(measures = [], key) {
  const s = measureSeriesFor(measures, key)
  if (s.length < 2) return null
  const prev = Number(s[s.length - 2].val) || 0
  const cur = Number(s[s.length - 1].val) || 0
  return Math.round((cur - prev) * 10) / 10
}

export function nextRotationRoutine(S) {
  const steps = S?.rotationSteps || []
  if (!steps.length) return null
  const idx = (Number(S?.rotationStep) || 0) % steps.length
  const step = steps[idx]
  if (!step) return null
  if (step.type === 'rest') return { isRest: true, index: idx, total: steps.length }
  const routine = (S?.routines || []).find(r => r.id === step.id) || null
  return { isRest: false, routine, index: idx, total: steps.length }
}

export const PLACE_PRESETS = [
  {
    id: 'commercial',
    name: 'Commercial Gym',
    equipment: ['barbell', 'dumbbell', 'cable', 'machine', 'body weight', 'ez barbell', 'smith machine', 'kettlebell'],
    plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  },
  {
    id: 'home',
    name: 'Home Gym',
    equipment: ['barbell', 'dumbbell', 'body weight', 'resistance band', 'kettlebell'],
    plates: [20, 10, 5, 2.5, 1.25],
  },
  {
    id: 'minimal',
    name: 'Dumbbells & Bodyweight',
    equipment: ['dumbbell', 'body weight'],
    plates: [],
  },
]

export function buildAiPlanPrompt(S) {
  const routines = (S?.routines || []).map(r => r.name).join(', ') || 'None yet'
  return [
    'Design a weekly gym workout plan for SmiTriX. Return ONLY clean markdown using this format:',
    '',
    '## Routine: Push Day',
    '- Barbell Bench Press | 4x8',
    '- Incline Dumbbell Press | 3x10',
    '- Dumbbell Lateral Raise | 3x15',
    '- Cable Triceps Pushdown | 3x12',
    '',
    '## Routine: Pull Day',
    '- Pull-Up | 4x8',
    '- Barbell Bent Over Row | 4x8',
    '- Face Pull | 3x15',
    '- Dumbbell Bicep Curl | 3x12',
    '',
    `My unit: ${S?.unit || 'kg'}. Current routines: ${routines}.`,
    'My goal: [describe your goal, days/week, and equipment here]',
  ].join('\n')
}

export function parseAiPlanText(text) {
  if (!text || typeof text !== 'string') return []
  const routines = []
  let current = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const h = line.match(/^#{1,3}\s*(?:Routine:\s*)?(.+)$/i)
    if (h) {
      current = { name: h[1].trim(), items: [] }
      routines.push(current)
      continue
    }
    const item = line.match(/^[-*•\d.]+\s*([^|]+?)(?:\s*\|\s*(\d+)\s*[x×]\s*(\d+))?$/i)
    if (item && current) {
      current.items.push({
        name: item[1].trim(),
        sets: Math.max(1, Math.min(10, parseInt(item[2], 10) || 3)),
        reps: Math.max(1, Math.min(50, parseInt(item[3], 10) || 10)),
      })
    }
  }
  return routines.filter(r => r.items.length > 0)
}
