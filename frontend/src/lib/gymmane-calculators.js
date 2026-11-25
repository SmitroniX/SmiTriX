// All 12 GymMane Calculators (1RM, Plates, Warm-up, RPE/RIR, DOTS, Wilks, BMI, Body Fat, FFMI, TDEE, Protein, Water)

const roundTo = (v, step = 2.5) => (step > 0 ? Math.round(v / step) * step : v)
const r1 = v => Math.round(v * 10) / 10
const r2 = v => Math.round(v * 100) / 100

export const TOOL_META = [
  { id: 'rm', group: 'strength', name: '1RM Calculator', desc: 'Estimate max strength & training %', icon: 'trophy' },
  { id: 'plate', group: 'strength', name: 'Plate Calculator', desc: 'Plates per side for any bar', icon: 'plate' },
  { id: 'warmup', group: 'strength', name: 'Warm-up Sets', desc: 'Progressive ramp to working weight', icon: 'flame' },
  { id: 'rpe', group: 'strength', name: 'RPE / RIR Load', desc: 'Convert effort into target weight', icon: 'target' },
  { id: 'dots', group: 'strength', name: 'DOTS Score', desc: 'Relative powerlifting strength', icon: 'medal' },
  { id: 'wilks', group: 'strength', name: 'Wilks Score', desc: 'Classic bodyweight strength index', icon: 'crown' },
  { id: 'bmi', group: 'body', name: 'BMI', desc: 'Body mass index & category', icon: 'scale' },
  { id: 'bf', group: 'body', name: 'Body Fat %', desc: 'US Navy circumference estimate', icon: 'ruler' },
  { id: 'ffmi', group: 'body', name: 'FFMI', desc: 'Fat-free mass index & lean mass', icon: 'biceps' },
  { id: 'cal', group: 'nutrition', name: 'Calories & TDEE', desc: 'Daily burn, cut/bulk & macros', icon: 'forkKnife' },
  { id: 'protein', group: 'nutrition', name: 'Protein Target', desc: 'Daily range by training goal', icon: 'bolt' },
  { id: 'water', group: 'nutrition', name: 'Water Intake', desc: 'Hydration for body & session', icon: 'droplet' },
]

export function calc1RM(weight, reps, pct = 100) {
  const w = Math.max(0, Number(weight) || 0)
  const r = Math.max(1, Math.min(30, Math.round(Number(reps) || 1)))
  const oneRm = r === 1 ? w : w * (1 + r / 30)
  const atPct = oneRm * (Math.max(10, Math.min(100, Number(pct) || 100)) / 100)
  const table = [100, 95, 90, 85, 80, 75, 70, 65, 60].map(p => ({
    pct: p,
    weight: r1(oneRm * (p / 100)),
    estReps: p === 100 ? 1 : Math.max(1, Math.round((100 / p - 1) * 30)),
  }))
  return { oneRm: r1(oneRm), atPct: r1(atPct), table }
}

export function calcPlates(target, barWeight = 20, unit = 'kg', owned = null) {
  const t = Math.max(0, Number(target) || 0)
  const bar = Math.max(0, Number(barWeight) || 0)
  const defaults = unit === 'lb' ? [45, 35, 25, 10, 5, 2.5, 1.25] : [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]
  const pool = (Array.isArray(owned) && owned.length ? [...owned] : defaults).sort((a, b) => b - a)
  let rem = Math.max(0, (t - bar) / 2)
  const perSide = []
  for (const p of pool) {
    if (p <= 0) continue
    const count = Math.floor((rem + 1e-6) / p)
    if (count > 0) {
      perSide.push({ plate: p, count })
      rem = Math.max(0, rem - count * p)
    }
  }
  const loaded = bar + perSide.reduce((s, x) => s + x.plate * x.count * 2, 0)
  return { perSide, loaded: r2(loaded), remainder: r2(rem * 2) }
}

export function calcWarmupSets(workingWeight, barWeight = 20, unit = 'kg') {
  const w = Math.max(barWeight, Number(workingWeight) || 0)
  const step = unit === 'lb' ? 5 : 2.5
  const ramp = [
    { label: 'Empty bar', pct: 0, reps: 10, weight: barWeight },
    { label: 'Light feel', pct: 45, reps: 6, weight: Math.max(barWeight, roundTo(w * 0.45, step)) },
    { label: 'Groove', pct: 65, reps: 4, weight: Math.max(barWeight, roundTo(w * 0.65, step)) },
    { label: 'Prime', pct: 80, reps: 2, weight: Math.max(barWeight, roundTo(w * 0.8, step)) },
    { label: 'Potentiate', pct: 90, reps: 1, weight: Math.max(barWeight, roundTo(w * 0.9, step)) },
  ]
  const deduped = []
  for (const s of ramp) {
    if (s.weight >= w && s.pct > 0) continue
    if (deduped.length && deduped[deduped.length - 1].weight === s.weight) continue
    deduped.push(s)
  }
  return deduped
}

// RPE percentage approximation (Tuchscherer-style continuous model)
function rpePct(reps, rpe) {
  const rir = Math.max(0, 10 - Math.max(5, Math.min(10, Number(rpe) || 8)))
  const effectiveReps = Math.max(1, (Number(reps) || 1) + rir)
  if (effectiveReps <= 1) return 1
  return 1 / (1 + (effectiveReps - 1) / 30)
}

export function calcRpeLoad(weight, reps, rpe, targetReps, targetRpe) {
  const w = Math.max(0, Number(weight) || 0)
  const pctNow = rpePct(reps, rpe)
  const oneRm = pctNow > 0 ? w / pctNow : w
  const pctGoal = rpePct(targetReps, targetRpe)
  const targetWeight = oneRm * pctGoal
  return { oneRm: r1(oneRm), targetWeight: r1(targetWeight), pctGoal: Math.round(pctGoal * 100) }
}

export function calcDots(bodyweightKg, totalKg, sex = 'male') {
  const bw = Math.max(40, Math.min(210, Number(bodyweightKg) || 75))
  const tot = Math.max(0, Number(totalKg) || 0)
  const c = sex === 'female'
    ? [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]
    : [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
  const denom = c[0] + c[1] * bw + c[2] * bw ** 2 + c[3] * bw ** 3 + c[4] * bw ** 4
  const score = denom > 0 ? (tot * 500) / denom : 0
  const level = score >= 480 ? 'Elite' : score >= 400 ? 'Advanced' : score >= 320 ? 'Intermediate' : score >= 240 ? 'Novice' : 'Beginner'
  return { score: r1(score), level }
}

export function calcWilks(bodyweightKg, totalKg, sex = 'male') {
  const bw = Math.max(40, Math.min(200, Number(bodyweightKg) || 75))
  const tot = Math.max(0, Number(totalKg) || 0)
  const c = sex === 'female'
    ? [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 0.00004731582, -0.00000009054]
    : [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 0.00000701863, -0.00000001291]
  const denom = c[0] + c[1] * bw + c[2] * bw ** 2 + c[3] * bw ** 3 + c[4] * bw ** 4 + c[5] * bw ** 5
  const score = denom > 0 ? (tot * 500) / denom : 0
  const level = score >= 450 ? 'Elite' : score >= 375 ? 'Advanced' : score >= 300 ? 'Intermediate' : score >= 225 ? 'Novice' : 'Beginner'
  return { score: r1(score), level }
}

export function calcBmi(weightKg, heightCm) {
  const h = Math.max(0.5, (Number(heightCm) || 175) / 100)
  const bmi = (Number(weightKg) || 75) / (h * h)
  const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  return { bmi: r1(bmi), category }
}

export function calcNavyBodyFat(sex, heightCm, neckCm, waistCm, hipCm = 95) {
  const h = Math.max(100, Number(heightCm) || 175)
  const n = Math.max(20, Number(neckCm) || 38)
  const w = Math.max(40, Number(waistCm) || 82)
  const hip = Math.max(50, Number(hipCm) || 95)
  let bf = 15
  if (sex === 'female') {
    const diff = Math.max(5, w + hip - n)
    bf = 495 / (1.29579 - 0.35004 * Math.log10(diff) + 0.221 * Math.log10(h)) - 450
  } else {
    const diff = Math.max(5, w - n)
    bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(h)) - 450
  }
  const clamped = Math.max(3, Math.min(60, bf))
  const cat = sex === 'female'
    ? (clamped < 14 ? 'Essential' : clamped < 21 ? 'Athletic' : clamped < 25 ? 'Fitness' : clamped < 32 ? 'Average' : 'Above average')
    : (clamped < 6 ? 'Essential' : clamped < 14 ? 'Athletic' : clamped < 18 ? 'Fitness' : clamped < 25 ? 'Average' : 'Above average')
  return { bf: r1(clamped), category: cat }
}

export function calcFfmi(weightKg, heightCm, bodyFatPct, sex = 'male') {
  const w = Math.max(30, Number(weightKg) || 75)
  const h = Math.max(1, (Number(heightCm) || 175) / 100)
  const bf = Math.max(3, Math.min(60, Number(bodyFatPct) || 15))
  const leanKg = w * (1 - bf / 100)
  const ffmi = leanKg / (h * h)
  const norm = ffmi + 6.1 * (1.8 - h)
  const thresh = sex === 'female' ? [14, 16, 18, 20] : [18, 20, 22, 24.5]
  const level = norm >= thresh[3] ? 'Elite' : norm >= thresh[2] ? 'Superior' : norm >= thresh[1] ? 'Above Average' : norm >= thresh[0] ? 'Average' : 'Below Average'
  return { ffmi: r1(ffmi), normalized: r1(norm), leanKg: r1(leanKg), level }
}

export function calcTdee(sex, age, heightCm, weightKg, activity = 1.55) {
  const w = Math.max(30, Number(weightKg) || 75)
  const h = Math.max(100, Number(heightCm) || 175)
  const a = Math.max(14, Number(age) || 26)
  const bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'female' ? -161 : 5)
  const tdee = Math.round(bmr * (Number(activity) || 1.55))
  const cut = Math.max(1200, tdee - 450)
  const bulk = tdee + 300
  const protein = Math.round(w * 2)
  const fat = Math.round((tdee * 0.25) / 9)
  const carbs = Math.max(50, Math.round((tdee - protein * 4 - fat * 9) / 4))
  return { bmr: Math.round(bmr), tdee, cut, bulk, macros: { protein, carbs, fat } }
}

export function calcProtein(weightKg, goal = 'hold') {
  const w = Math.max(30, Number(weightKg) || 75)
  const [lo, hi] = goal === 'lose' ? [1.8, 2.4] : goal === 'gain' ? [1.6, 2.2] : [1.4, 2.0]
  return { low: Math.round(w * lo), high: Math.round(w * hi) }
}

export function calcWater(weightKg, trainMin = 60) {
  const w = Math.max(30, Number(weightKg) || 75)
  const m = Math.max(0, Number(trainMin) || 0)
  const liters = w * 0.033 + (m / 60) * 0.65
  return { liters: r1(liters), ml: Math.round(liters * 1000) }
}
