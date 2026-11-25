import { describe, expect, it } from 'vitest'
import {
  TOOL_META,
  calc1RM,
  calcPlates,
  calcWarmupSets,
  calcRpeLoad,
  calcDots,
  calcWilks,
  calcBmi,
  calcNavyBodyFat,
  calcFfmi,
  calcTdee,
  calcProtein,
  calcWater,
} from './gymmane-calculators.js'

describe('gymmane-calculators', () => {
  it('registers all 12 tools with metadata', () => {
    expect(TOOL_META).toHaveLength(12)
    expect(new Set(TOOL_META.map(t => t.id)).size).toBe(12)
  })

  it('calculates 1RM and percentage table', () => {
    const r = calc1RM(100, 5, 80)
    expect(r.oneRm).toBeCloseTo(116.7, 1)
    expect(r.atPct).toBeCloseTo(93.3, 1)
    expect(r.table).toHaveLength(9)
    expect(calc1RM(100, 1).oneRm).toBe(100)
  })

  it('calculates per-side plates with default and owned plate sets', () => {
    const r = calcPlates(100, 20, 'kg')
    expect(r.loaded).toBe(100)
    expect(r.remainder).toBe(0)
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ])

    const custom = calcPlates(102, 20, 'kg', [20, 10])
    expect(custom.loaded).toBe(100)
    expect(custom.remainder).toBe(2)
  })

  it('generates deduped warm-up ramp below working weight', () => {
    const sets = calcWarmupSets(100, 20, 'kg')
    expect(sets[0].weight).toBe(20)
    expect(sets.every(s => s.weight < 100)).toBe(true)
    expect(sets.length).toBeGreaterThanOrEqual(4)
  })

  it('converts RPE/RIR loads between rep ranges', () => {
    const res = calcRpeLoad(100, 5, 8, 3, 9)
    expect(res.oneRm).toBeGreaterThan(115)
    expect(res.targetWeight).toBeGreaterThan(100)
    expect(res.pctGoal).toBeGreaterThan(80)
  })

  it('computes DOTS and Wilks scores for male and female lifters', () => {
    const dm = calcDots(80, 500, 'male')
    const df = calcDots(60, 400, 'female')
    expect(dm.score).toBeGreaterThan(300)
    expect(df.score).toBeGreaterThan(350)
    expect(dm.level).toBeTruthy()

    const wm = calcWilks(80, 500, 'male')
    const wf = calcWilks(60, 400, 'female')
    expect(wm.score).toBeGreaterThan(300)
    expect(wf.score).toBeGreaterThan(350)
  })

  it('computes BMI, US Navy Body Fat %, and FFMI', () => {
    const bmi = calcBmi(75, 180)
    expect(bmi.bmi).toBeCloseTo(23.1, 1)
    expect(bmi.category).toBe('Normal')

    const bfM = calcNavyBodyFat('male', 180, 39, 82)
    const bfF = calcNavyBodyFat('female', 165, 33, 70, 96)
    expect(bfM.bf).toBeGreaterThan(8)
    expect(bfM.bf).toBeLessThan(25)
    expect(bfF.bf).toBeGreaterThan(14)
    expect(bfF.bf).toBeLessThan(35)

    const ffmi = calcFfmi(80, 180, 15, 'male')
    expect(ffmi.leanKg).toBe(68)
    expect(ffmi.ffmi).toBeCloseTo(21, 0)
  })

  it('computes TDEE, protein range, and daily water target', () => {
    const cal = calcTdee('male', 26, 180, 80, 1.55)
    expect(cal.tdee).toBeGreaterThan(cal.bmr)
    expect(cal.cut).toBeLessThan(cal.tdee)
    expect(cal.bulk).toBeGreaterThan(cal.tdee)
    expect(cal.macros.protein).toBe(160)

    const prot = calcProtein(80, 'lose')
    expect(prot.low).toBe(144)
    expect(prot.high).toBe(192)

    const wat = calcWater(80, 60)
    expect(wat.liters).toBeCloseTo(3.3, 1)
    expect(wat.ml).toBeGreaterThan(3000)
  })
})
