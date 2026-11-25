// GymMane Nutrition Library, Macro Math, Offline AI Meal Parser & Fasting Helpers

export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sun' },
  { id: 'lunch', label: 'Lunch', icon: 'forkKnife' },
  { id: 'dinner', label: 'Dinner', icon: 'moon' },
  { id: 'snacks', label: 'Snacks', icon: 'sparkles' },
]

export const FOOD_CATS = [
  { id: 'all', label: 'All' },
  { id: 'protein', label: 'Protein' },
  { id: 'grain', label: 'Grains' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'veg', label: 'Veggies' },
  { id: 'fat', label: 'Fats & Nuts' },
  { id: 'drink', label: 'Drinks' },
  { id: 'other', label: 'Other' },
]

let cachedFoods = null
let loadingPromise = null

export function parseFoodsTsv(text) {
  if (!text) return []
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split('\t')
  const col = name => header.indexOf(name)
  const iId = col('id')
  const iEn = col('en')
  const iK = col('k')
  const iP = col('p')
  const iC = col('c')
  const iF = col('f')
  const iFi = col('fi')
  const iSu = col('su')
  const iNa = col('na')
  const iMl = col('ml')
  const iKind = col('kind')
  const iG = col('g')
  const iCat = col('cat')

  const out = []
  for (let idx = 1; idx < lines.length; idx++) {
    const parts = lines[idx].split('\t')
    const rawId = parts[iId] || ''
    const name = parts[iEn] || ''
    if (!rawId || !name) continue
    const slug = rawId.replace(/^[a-z]:/, '')
    out.push({
      id: rawId,
      slug,
      name,
      photo: `./smitrix-ui/food/${slug}.webp`,
      kcal: parseFloat(parts[iK]) || 0,
      protein: parseFloat(parts[iP]) || 0,
      carbs: parseFloat(parts[iC]) || 0,
      fat: parseFloat(parts[iF]) || 0,
      fiber: parseFloat(parts[iFi]) || 0,
      sugar: parseFloat(parts[iSu]) || 0,
      sodium: parseFloat(parts[iNa]) || 0,
      liquid: parts[iMl] === '1',
      portionKind: parts[iKind] || 'unit',
      portionGrams: parseFloat(parts[iG]) || 100,
      cat: parts[iCat] || 'other',
    })
  }
  return out
}

export async function loadFoodLibrary() {
  if (cachedFoods) return cachedFoods
  if (!loadingPromise) {
    loadingPromise = fetch('./smitrix-ui/data/foods.tsv')
      .then(r => (r.ok ? r.text() : ''))
      .then(txt => {
        cachedFoods = parseFoodsTsv(txt)
        return cachedFoods
      })
      .catch(() => [])
  }
  return loadingPromise
}

export function scaleMacros(food, grams) {
  const g = Math.max(0, Number(grams) || 0)
  const factor = g / 100
  return {
    kcal: Math.round((food.kcal || 0) * factor),
    protein: Math.round((food.protein || 0) * factor * 10) / 10,
    carbs: Math.round((food.carbs || 0) * factor * 10) / 10,
    fat: Math.round((food.fat || 0) * factor * 10) / 10,
    fiber: Math.round((food.fiber || 0) * factor * 10) / 10,
  }
}

export function sumDayMacros(entriesForDay = []) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const e of entriesForDay) {
    totals.kcal += Number(e.kcal) || 0
    totals.protein += Number(e.protein) || 0
    totals.carbs += Number(e.carbs) || 0
    totals.fat += Number(e.fat) || 0
    totals.fiber += Number(e.fiber) || 0
  }
  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
  }
}

export function buildAiMealPrompt(description = '') {
  return [
    'Convert my meal into a clean nutrition list. Return ONLY lines in this exact format:',
    'FOOD: <name> | <grams>g | <kcal> kcal | P <protein>g | C <carbs>g | F <fat>g',
    '',
    'Example:',
    'FOOD: Chicken Breast | 180g | 297 kcal | P 55.8g | C 0g | F 6.5g',
    'FOOD: Jasmine Rice (cooked) | 200g | 260 kcal | P 5.4g | C 56g | F 0.6g',
    '',
    description ? `My meal: ${description}` : 'My meal: [describe what you ate here]',
  ].join('\n')
}

export function parseAiMealText(text) {
  if (!text || typeof text !== 'string') return []
  const items = []
  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    // Match `FOOD: Name | 180g | 297 kcal | P 55.8g | C 0g | F 6.5g` or flexible markdown lines
    const m = line.match(/^(?:FOOD:\s*|[-*•]\s*)?([^|]+?)\s*\|\s*(\d+(?:\.\d+)?)\s*(?:g|ml)?\s*\|\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal)?\s*\|\s*P[:\s]*(\d+(?:\.\d+)?)g?\s*\|\s*C[:\s]*(\d+(?:\.\d+)?)g?\s*\|\s*F[:\s]*(\d+(?:\.\d+)?)g?/i)
    if (m) {
      items.push({
        name: m[1].trim(),
        grams: parseFloat(m[2]) || 100,
        kcal: Math.round(parseFloat(m[3]) || 0),
        protein: Math.round((parseFloat(m[4]) || 0) * 10) / 10,
        carbs: Math.round((parseFloat(m[5]) || 0) * 10) / 10,
        fat: Math.round((parseFloat(m[6]) || 0) * 10) / 10,
      })
      continue
    }
    // Also support JSON array or object fallback
    if (line.startsWith('{') || line.startsWith('[')) {
      try {
        const parsed = JSON.parse(text)
        const arr = Array.isArray(parsed) ? parsed : [parsed]
        for (const obj of arr) {
          if (obj?.name && (obj.kcal != null || obj.calories != null)) {
            items.push({
              name: String(obj.name),
              grams: Number(obj.grams || obj.g || 100),
              kcal: Math.round(Number(obj.kcal ?? obj.calories) || 0),
              protein: Number(obj.protein ?? obj.p ?? 0),
              carbs: Number(obj.carbs ?? obj.c ?? 0),
              fat: Number(obj.fat ?? obj.f ?? 0),
            })
          }
        }
        if (items.length) return items
      } catch { /* continue line parsing */ }
    }
  }
  return items
}

export function fastingProgress(fasting, nowMs = Date.now()) {
  if (!fasting || !fasting.startMs) return null
  const goalSec = Math.max(3600, (Number(fasting.goalHours) || 16) * 3600)
  const elapsedSec = Math.max(0, Math.floor((nowMs - fasting.startMs) / 1000))
  const remainingSec = Math.max(0, goalSec - elapsedSec)
  const pct = Math.min(1, elapsedSec / goalSec)
  const stage = elapsedSec < 4 * 3600
    ? 'Blood sugar stabilizing'
    : elapsedSec < 12 * 3600
      ? 'Fat-burning transition'
      : elapsedSec < 16 * 3600
        ? 'Ketosis ramping'
        : 'Deep cellular autophagy'
  return { elapsedSec, remainingSec, goalSec, pct, done: remainingSec === 0, stage }
}
