// GymMane 20 Medals, Leveling, Streak-with-Days-Off, Heat Tones & Month Recap Engine
import { workoutVolume } from './history.js'
import { musclesOf, MUSCLE_NAME } from './muscles.js'
import { exOr } from './exercises.js'
import { isoOf, todayISO } from './format.js'

export const HEAT_TONES = {
  ember: {
    id: 'ember',
    name: 'Ember',
    ramp: ['var(--gm-heat-empty)', '#6D3B26', '#A6582D', '#D9853B', '#F4BE63'],
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    ramp: ['var(--gm-heat-empty)', '#2F402A', '#4D6A43', '#739360', '#A8C99E'],
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    ramp: ['var(--gm-heat-empty)', '#1F374C', '#2E5B7C', '#5187AF', '#8BC2E8'],
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    ramp: ['var(--gm-heat-empty)', '#382B4F', '#5A4484', '#8667BA', '#B79BE8'],
  },
  mono: {
    id: 'mono',
    name: 'Mono',
    ramp: ['var(--gm-heat-empty)', '#444444', '#777777', '#B5B5B5', '#FFFFFF'],
  },
}

export const AWARD_DEFS = [
  { id: 'firstStep', name: 'First step', desc: 'Created your profile and stepped onto the floor', check: () => true },
  { id: 'firstWorkout', name: 'First workout', desc: 'Logged your very first training session', check: st => st.sessions >= 1 },
  { id: 'firstRoutine', name: 'First routine', desc: 'Built a reusable training routine', check: st => st.routines >= 1 },
  { id: 'firstRecord', name: 'First record', desc: 'Set a personal record on a lift', check: st => st.records >= 1 },
  { id: 'streak3', name: '3-day streak', desc: 'Stayed consistent for 3 days straight', check: st => st.bestStreak >= 3 },
  { id: 'streak7', name: '7-day streak', desc: 'A full week of showing up', check: st => st.bestStreak >= 7 },
  { id: 'workouts10', name: '10 workouts', desc: 'Completed 10 logged sessions', check: st => st.sessions >= 10 },
  { id: 'tonne1', name: 'First tonne', desc: 'Moved 1,000 kg across your sets', check: st => st.volumeKg >= 1000 },
  { id: 'sets100', name: '100 sets', desc: 'Ticked off 100 working sets', check: st => st.sets >= 100 },
  { id: 'hours10', name: '10 hours', desc: 'Logged 10 hours under the bar', check: st => st.hours >= 10 },
  { id: 'workouts50', name: '50 workouts', desc: 'Fifty sessions in the books', check: st => st.sessions >= 50 },
  { id: 'tonnes10', name: '10 tonnes', desc: 'Moved 10,000 kg total volume', check: st => st.volumeKg >= 10000 },
  { id: 'hours50', name: '50 hours', desc: 'Fifty hours of dedicated training', check: st => st.hours >= 50 },
  { id: 'streak30', name: '30-day streak', desc: 'An entire month unbroken', check: st => st.bestStreak >= 30 },
  { id: 'sets1000', name: '1,000 sets', desc: 'One thousand completed sets', check: st => st.sets >= 1000 },
  { id: 'workouts100', name: '100 workouts', desc: 'Entered the Century Club', check: st => st.sessions >= 100 },
  { id: 'hours100', name: '100 hours', desc: 'One hundred hours trained', check: st => st.hours >= 100 },
  { id: 'streak100', name: '100-day streak', desc: 'Unstoppable 100-day consistency', check: st => st.bestStreak >= 100 },
  { id: 'tonnes100', name: '100 tonnes', desc: 'Lifted a hundred metric tonnes', check: st => st.volumeKg >= 100000 },
  { id: 'workouts365', name: '365 workouts', desc: 'A full year worth of sessions', check: st => st.sessions >= 365 },
]

// Day streak that respects planned Rest Days / Days Off (S.daysOff)
export function dayStreakWithOff(S, refIso = todayISO()) {
  const trained = new Set((S?.workouts || []).map(w => w.d).filter(Boolean))
  const off = new Set(S?.daysOff || [])
  if (!trained.size) return { current: 0, best: 0 }

  // Current streak walking back from refIso (or yesterday if not yet trained today)
  const parse = iso => new Date(iso + 'T12:00:00')
  const shift = (d, delta) => { const n = new Date(d); n.setDate(n.getDate() + delta); return n }

  let cur = 0
  let cursor = parse(refIso)
  if (!trained.has(isoOf(cursor)) && !off.has(isoOf(cursor))) {
    cursor = shift(cursor, -1)
  }
  let guard = 0
  let sawWorkout = false
  while (guard++ < 1500) {
    const key = isoOf(cursor)
    if (trained.has(key)) {
      cur++
      sawWorkout = true
    } else if (off.has(key)) {
      // Day off preserves streak without adding a fake workout day
    } else {
      break
    }
    cursor = shift(cursor, -1)
  }
  if (!sawWorkout) cur = 0

  // Best historical streak across all trained dates
  const dates = Array.from(trained).sort()
  let best = 0
  let run = 0
  let prev = null
  for (const iso of dates) {
    if (!prev) {
      run = 1
    } else {
      const a = parse(prev)
      const b = parse(iso)
      const diff = Math.round((b - a) / 86400000)
      if (diff === 1) {
        run++
      } else if (diff > 1) {
        // Check if every day between prev and iso is in daysOff
        let bridged = true
        for (let step = 1; step < diff; step++) {
          if (!off.has(isoOf(shift(a, step)))) { bridged = false; break }
        }
        run = bridged ? run + 1 : 1
      }
    }
    if (run > best) best = run
    prev = iso
  }

  return { current: cur, best: Math.max(best, cur) }
}

export function evaluateGymManeAwards(S) {
  const workouts = S?.workouts || []
  const toKg = S?.unit === 'lb' ? 0.45359237 : 1
  let sets = 0
  let volumeKg = 0
  let totalMin = 0
  for (const w of workouts) {
    volumeKg += workoutVolume(w) * toKg
    if (w.start && w.end && w.end > w.start) totalMin += (w.end - w.start) / 60000
    else totalMin += 40
    for (const e of w.entries || []) {
      for (const s of e.sets || []) if (s.done) sets++
    }
  }
  const streak = dayStreakWithOff(S)
  const metrics = {
    sessions: workouts.length,
    routines: (S?.routines || []).length,
    records: Object.keys(S?.exWeights || {}).length,
    sets,
    volumeKg,
    hours: totalMin / 60,
    currentStreak: streak.current,
    bestStreak: streak.best,
  }

  const awards = AWARD_DEFS.map(def => ({
    ...def,
    earned: Boolean(def.check(metrics)),
    wonAt: S?.awardsWonAt?.[def.id] || null,
  }))
  const earnedCount = awards.filter(a => a.earned).length
  const xp = workouts.length * 120 + sets * 4 + earnedCount * 250
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 180)) + 1)
  const nextLevelXp = Math.pow(level, 2) * 180
  const prevLevelXp = Math.pow(level - 1, 2) * 180
  const levelProgress = Math.max(0, Math.min(1, (xp - prevLevelXp) / Math.max(1, nextLevelXp - prevLevelXp)))

  return { awards, earnedCount, total: awards.length, metrics, xp, level, levelProgress }
}

export function buildMonthRecap(S, year, monthIndex) {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = monthIndex ?? now.getMonth()
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
  const workouts = (S?.workouts || []).filter(w => String(w.d || '').startsWith(prefix))

  let sets = 0
  let reps = 0
  let volume = 0
  let minutes = 0
  const muscleCount = {}
  const liftCount = {}
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0]
  let bestLift = null

  for (const w of workouts) {
    volume += workoutVolume(w)
    minutes += (w.start && w.end && w.end > w.start) ? Math.round((w.end - w.start) / 60000) : 45
    if (w.d) {
      const wd = new Date(w.d + 'T12:00:00').getDay()
      if (wd >= 0 && wd < 7) weekdayCount[wd]++
    }
    for (const e of w.entries || []) {
      const done = (e.sets || []).filter(s => s.done)
      if (!done.length) continue
      sets += done.length
      liftCount[e.id] = (liftCount[e.id] || 0) + done.length
      for (const s of done) {
        reps += Number(s.r) || 0
        const wt = Number(s.w) || 0
        if (!bestLift || wt > bestLift.weight) {
          bestLift = { id: e.id, weight: wt, reps: Number(s.r) || 0, date: w.d }
        }
      }
      const ex = exOr(e.id)
      if (ex) {
        for (const [slug, wt] of Object.entries(musclesOf(ex))) {
          muscleCount[slug] = (muscleCount[slug] || 0) + wt * done.length
        }
      }
    }
  }

  const topMuscleEntry = Object.entries(muscleCount).sort((a, b) => b[1] - a[1])[0]
  const topLiftEntry = Object.entries(liftCount).sort((a, b) => b[1] - a[1])[0]
  const favDayIdx = weekdayCount.indexOf(Math.max(...weekdayCount))
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthName = new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' })

  const streak = dayStreakWithOff(S)
  return {
    year: y,
    monthIndex: m,
    monthName,
    empty: workouts.length === 0,
    sessions: workouts.length,
    sets,
    reps,
    volume: Math.round(volume),
    minutes,
    hours: Math.round((minutes / 60) * 10) / 10,
    topMuscle: topMuscleEntry ? { slug: topMuscleEntry[0], name: MUSCLE_NAME[topMuscleEntry[0]] || topMuscleEntry[0], sets: Math.round(topMuscleEntry[1]) } : null,
    topLift: topLiftEntry ? { id: topLiftEntry[0], ex: exOr(topLiftEntry[0]), sets: topLiftEntry[1] } : null,
    bestLift: bestLift ? { ...bestLift, ex: exOr(bestLift.id) } : null,
    favDay: workouts.length ? dayNames[favDayIdx] : null,
    streak: streak.current,
    muscleCount,
  }
}
