// SmiTriX — Comprehensive Athletic Achievement & Milestone Engine
// Gamified gym milestones, strength clubs, consistency honors, and Golden Era tributes.

import { fmtNum } from './format.js'
import { streakWeeks } from './history.js'

export const ACHIEVEMENT_TIERS = {
  bronze: { name: 'Bronze', color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)', border: 'rgba(205, 127, 50, 0.35)', points: 50 },
  silver: { name: 'Silver', color: '#c0c0c0', bg: 'rgba(192, 192, 192, 0.15)', border: 'rgba(192, 192, 192, 0.35)', points: 100 },
  gold: { name: 'Gold', color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)', border: 'rgba(255, 215, 0, 0.4)', points: 250 },
  obsidian: { name: 'Obsidian', color: '#30d158', bg: 'rgba(48, 209, 88, 0.15)', border: 'rgba(48, 209, 88, 0.45)', points: 500 },
}

export const ACHIEVEMENTS = [
  // --- Consistency & Milestones ---
  {
    id: 'first_session',
    title: 'Iron Initiate',
    category: 'consistency',
    tier: 'bronze',
    icon: 'flame',
    desc: 'Log and complete your first official workout session on SmiTriX.',
    check: (S, workouts) => {
      const current = workouts.length
      const target = 1
      return {
        current,
        target,
        unlocked: current >= target,
        pct: Math.min(100, Math.round((current / target) * 100)),
        progressText: `${current}/${target}`
      }
    }
  },
  {
    id: 'streak_4',
    title: 'Unbroken Chain',
    category: 'consistency',
    tier: 'silver',
    icon: 'flame',
    desc: 'Maintain an active training streak for 4 consecutive weeks.',
    check: (S) => {
      const current = streakWeeks(S)
      const target = 4
      return {
        current,
        target,
        unlocked: current >= target,
        pct: Math.min(100, Math.round((current / target) * 100)),
        progressText: `${current}/${target} weeks`
      }
    }
  },
  {
    id: 'streak_12',
    title: 'Iron Discipline',
    category: 'consistency',
    tier: 'gold',
    icon: 'crown',
    desc: 'Maintain an active training streak for 12 consecutive weeks without faltering.',
    check: (S) => {
      const current = streakWeeks(S)
      const target = 12
      return {
        current,
        target,
        unlocked: current >= target,
        pct: Math.min(100, Math.round((current / target) * 100)),
        progressText: `${current}/${target} weeks`
      }
    }
  },
  {
    id: 'centurion_sets',
    title: 'Centurion of Sets',
    category: 'volume',
    tier: 'silver',
    icon: 'check',
    desc: 'Complete 100 total working sets across all training sessions.',
    check: (S, workouts) => {
      const current = workouts.reduce((sum, w) =>
        sum + (w.entries || []).reduce((s2, e) => s2 + (e.sets || []).filter(s => s.done).length, 0), 0)
      const target = 100
      return {
        current,
        target,
        unlocked: current >= target,
        pct: Math.min(100, Math.round((current / target) * 100)),
        progressText: `${current}/${target} sets`
      }
    }
  },
  {
    id: 'workouts_25',
    title: 'Dedicated Lifter',
    category: 'consistency',
    tier: 'silver',
    icon: 'medal',
    desc: 'Log and complete 25 completed workout sessions.',
    check: (S, workouts) => {
      const current = workouts.length
      const target = 25
      return {
        current,
        target,
        unlocked: current >= target,
        pct: Math.min(100, Math.round((current / target) * 100)),
        progressText: `${current}/${target} sessions`
      }
    }
  },
  {
    id: 'workouts_100',
    title: 'Centurion Athlete',
    category: 'consistency',
    tier: 'obsidian',
    icon: 'trophy',
    desc: 'Join the elite ranks with 100 complete recorded workout sessions.',
    check: (S, workouts) => {
      const current = workouts.length
      const target = 100
      return {
        current,
        target,
        unlocked: current >= target,
        pct: Math.min(100, Math.round((current / target) * 100)),
        progressText: `${current}/${target} sessions`
      }
    }
  },

  // --- Volume & Metal Moved ---
  {
    id: 'session_volume_5k',
    title: 'Heavy Artillery',
    category: 'volume',
    tier: 'bronze',
    icon: 'dumbbell',
    desc: 'Lift over 5,000 kg (or equivalent) total tonnage in a single workout.',
    check: (S, workouts) => {
      const maxSessionVol = workouts.reduce((max, w) => Math.max(max, w.vol || 0), 0)
      const target = S.unit === 'lb' ? 11000 : 5000
      return {
        current: Math.round(maxSessionVol),
        target,
        unlocked: maxSessionVol >= target,
        pct: Math.min(100, Math.round((maxSessionVol / target) * 100)),
        progressText: `${fmtNum(Math.round(maxSessionVol))}/${fmtNum(target)} ${S.unit}`
      }
    }
  },
  {
    id: 'session_volume_10k',
    title: '10-Ton Titan',
    category: 'volume',
    tier: 'gold',
    icon: 'bolt',
    desc: 'Move an astounding 10,000 kg (22,000 lbs) in a single brutal workout.',
    check: (S, workouts) => {
      const maxSessionVol = workouts.reduce((max, w) => Math.max(max, w.vol || 0), 0)
      const target = S.unit === 'lb' ? 22000 : 10000
      return {
        current: Math.round(maxSessionVol),
        target,
        unlocked: maxSessionVol >= target,
        pct: Math.min(100, Math.round((maxSessionVol / target) * 100)),
        progressText: `${fmtNum(Math.round(maxSessionVol))}/${fmtNum(target)} ${S.unit}`
      }
    }
  },
  {
    id: 'lifetime_volume_100k',
    title: 'Mountain Mover',
    category: 'volume',
    tier: 'obsidian',
    icon: 'shield',
    desc: 'Surpass 100,000 kg of lifetime steel lifted in your training history.',
    check: (S, workouts) => {
      const totalVol = workouts.reduce((sum, w) => sum + (w.vol || 0), 0)
      const target = S.unit === 'lb' ? 220000 : 100000
      return {
        current: Math.round(totalVol),
        target,
        unlocked: totalVol >= target,
        pct: Math.min(100, Math.round((totalVol / target) * 100)),
        progressText: `${fmtNum(Math.round(totalVol / 1000))}k / ${fmtNum(target / 1000)}k ${S.unit}`
      }
    }
  },

  // --- Strength Milestones (The Big Lifts) ---
  {
    id: 'bench_100',
    title: 'Century Bench',
    category: 'strength',
    tier: 'silver',
    icon: 'barbell',
    desc: 'Bench press 100 kg (225 lbs — two 45 lb plates on each side).',
    check: (S) => {
      const w = Number(S.exWeights?.['0025']?.w) || 0
      const target = S.unit === 'lb' ? 225 : 100
      return {
        current: w,
        target,
        unlocked: w >= target,
        pct: Math.min(100, Math.round((w / target) * 100)),
        progressText: `${w}/${target} ${S.unit}`
      }
    }
  },
  {
    id: 'squat_140',
    title: 'Double Wheel Squat',
    category: 'strength',
    tier: 'gold',
    icon: 'legs',
    desc: 'Squat 140 kg (315 lbs — three 45 lb plates on each side).',
    check: (S) => {
      const w = Number(S.exWeights?.['0043']?.w) || 0
      const target = S.unit === 'lb' ? 315 : 140
      return {
        current: w,
        target,
        unlocked: w >= target,
        pct: Math.min(100, Math.round((w / target) * 100)),
        progressText: `${w}/${target} ${S.unit}`
      }
    }
  },
  {
    id: 'deadlift_180',
    title: 'Deadlift Beast',
    category: 'strength',
    tier: 'gold',
    icon: 'figureStrength',
    desc: 'Deadlift 180 kg (405 lbs — four 45 lb plates on each side).',
    check: (S) => {
      const w = Math.max(Number(S.exWeights?.['0085']?.w) || 0, Number(S.exWeights?.['0027']?.w) || 0)
      const target = S.unit === 'lb' ? 405 : 180
      return {
        current: w,
        target,
        unlocked: w >= target,
        pct: Math.min(100, Math.round((w / target) * 100)),
        progressText: `${w}/${target} ${S.unit}`
      }
    }
  },
  {
    id: 'ohp_70',
    title: 'Overhead Titan',
    category: 'strength',
    tier: 'silver',
    icon: 'arm',
    desc: 'Overhead Press 70 kg (155 lbs) with strict barbell form.',
    check: (S) => {
      const w = Number(S.exWeights?.['0426']?.w) || 0
      const target = S.unit === 'lb' ? 155 : 70
      return {
        current: w,
        target,
        unlocked: w >= target,
        pct: Math.min(100, Math.round((w / target) * 100)),
        progressText: `${w}/${target} ${S.unit}`
      }
    }
  },
  {
    id: 'club_1000lb',
    title: '1,000 lb Club Elite',
    category: 'strength',
    tier: 'obsidian',
    icon: 'crown',
    desc: 'Achieve a combined Big 3 total (Bench + Squat + Deadlift) of 1,000 lbs (453.5 kg).',
    check: (S) => {
      const bench = Number(S.exWeights?.['0025']?.w) || 0
      const squat = Number(S.exWeights?.['0043']?.w) || 0
      const dl = Number(S.exWeights?.['0085']?.w) || 0
      const total = bench + squat + dl
      const target = S.unit === 'lb' ? 1000 : 453.5
      return {
        current: Math.round(total * 10) / 10,
        target: Math.round(target),
        unlocked: total >= target,
        pct: Math.min(100, Math.round((total / target) * 100)),
        progressText: `${fmtNum(Math.round(total))}/${fmtNum(Math.round(target))} ${S.unit}`
      }
    }
  },

  // --- Golden Era & Legend Protocols ---
  {
    id: 'golden_era_disciple',
    title: 'Golden Era Disciple',
    category: 'legend',
    tier: 'gold',
    icon: 'medal',
    desc: 'Perform and log Arnold Schwarzenegger, Mike Mentzer, Dorian Yates, or Frank Zane splits.',
    check: (S, workouts) => {
      const legendKeywords = ['golden era', 'arnold', 'mentzer', 'heavy duty', 'dorian', 'blood & guts', 'zane', 'platz']
      const count = workouts.filter(w => {
        const name = (w.name || '').toLowerCase()
        return legendKeywords.some(k => name.includes(k))
      }).length
      const target = 1
      return {
        current: count,
        target,
        unlocked: count >= target,
        pct: Math.min(100, Math.round((count / target) * 100)),
        progressText: count >= 1 ? 'Honored' : '0/1 session'
      }
    }
  },
  {
    id: 'body_type_scholar',
    title: 'Somatotype Master',
    category: 'legend',
    tier: 'silver',
    icon: 'sparkles',
    desc: 'Adopt a scientifically tailored Ectomorph, Mesomorph, or Endomorph training protocol.',
    check: (S, workouts) => {
      const count = workouts.filter(w => {
        const name = (w.name || '').toLowerCase()
        return name.includes('ecto') || name.includes('meso') || name.includes('endo') || (S.athleteProfile?.bodyType)
      }).length + (S.athleteProfile?.bodyType ? 1 : 0)
      const target = 1
      return {
        current: count,
        target,
        unlocked: count >= target,
        pct: Math.min(100, Math.round((count / target) * 100)),
        progressText: count >= 1 ? 'Applied' : '0/1 assigned'
      }
    }
  }
]

export function evaluateAchievements(S) {
  const workouts = S.workouts || []
  let totalPoints = 0
  let unlockedCount = 0

  const items = ACHIEVEMENTS.map(ach => {
    const res = ach.check(S, workouts)
    const tierMeta = ACHIEVEMENT_TIERS[ach.tier]
    if (res.unlocked) {
      unlockedCount++
      totalPoints += tierMeta.points
    }
    return {
      ...ach,
      ...res,
      tierMeta,
      points: tierMeta.points
    }
  })

  return {
    items,
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    totalPoints,
    maxPoints: ACHIEVEMENTS.reduce((sum, a) => sum + ACHIEVEMENT_TIERS[a.tier].points, 0),
    unlockedPct: Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)
  }
}
