import { describe, expect, it } from 'vitest'
import {
  AWARD_DEFS,
  HEAT_TONES,
  dayStreakWithOff,
  evaluateGymManeAwards,
  buildMonthRecap,
} from './gymmane-awards.js'

describe('gymmane-awards', () => {
  it('defines all 20 medals and 5 heatmap palettes', () => {
    expect(AWARD_DEFS).toHaveLength(20)
    expect(Object.keys(HEAT_TONES)).toEqual(['ember', 'sage', 'ocean', 'violet', 'mono'])
  })

  it('bridges planned rest days in dayStreakWithOff without breaking streaks', () => {
    const S = {
      workouts: [
        { d: '2026-10-10' },
        { d: '2026-10-12' },
        { d: '2026-10-13' },
      ],
      daysOff: ['2026-10-11'],
    }
    const st = dayStreakWithOff(S, '2026-10-13')
    expect(st.current).toBe(3)
    expect(st.best).toBe(3)

    // Without day off on Oct 11, streak resets to 2
    const broken = dayStreakWithOff({ workouts: S.workouts, daysOff: [] }, '2026-10-13')
    expect(broken.current).toBe(2)
    expect(broken.best).toBe(2)
  })

  it('evaluates earned medals, XP, and level', () => {
    const S = {
      unit: 'kg',
      routines: [{ id: 'r1', name: 'Push', ex: [] }],
      exWeights: { '0025': { w: 100, d: '2026-10-10' } },
      workouts: [
        {
          id: 'w1',
          d: '2026-10-10',
          start: 1000,
          end: 1000 + 60 * 60000,
          entries: [
            {
              id: '0025',
              sets: [
                { w: 100, r: 10, done: true },
                { w: 100, r: 10, done: true },
              ],
            },
          ],
        },
      ],
    }
    const res = evaluateGymManeAwards(S)
    const earnedIds = res.awards.filter(a => a.earned).map(a => a.id)
    expect(earnedIds).toContain('firstStep')
    expect(earnedIds).toContain('firstWorkout')
    expect(earnedIds).toContain('firstRoutine')
    expect(earnedIds).toContain('firstRecord')
    expect(earnedIds).toContain('tonne1')
    expect(res.level).toBeGreaterThanOrEqual(1)
    expect(res.xp).toBeGreaterThan(0)
  })

  it('builds monthly recap metrics accurately', () => {
    const S = {
      workouts: [
        {
          id: 'w1',
          d: '2026-10-05',
          start: 0,
          end: 3600000,
          entries: [{ id: '0025', sets: [{ w: 100, r: 8, done: true }] }],
        },
        {
          id: 'w2',
          d: '2026-09-20',
          start: 0,
          end: 3600000,
          entries: [{ id: '0025', sets: [{ w: 90, r: 8, done: true }] }],
        },
      ],
    }
    const oct = buildMonthRecap(S, 2026, 9) // 0-indexed October
    expect(oct.empty).toBe(false)
    expect(oct.monthName).toBe('October')
    expect(oct.sessions).toBe(1)
    expect(oct.sets).toBe(1)
    expect(oct.reps).toBe(8)
    expect(oct.volume).toBe(800)
    expect(oct.bestLift.weight).toBe(100)
  })
})
