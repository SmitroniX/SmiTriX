import { describe, expect, it } from 'vitest'
import {
  parseFoodsTsv,
  scaleMacros,
  sumDayMacros,
  buildAiMealPrompt,
  parseAiMealText,
  fastingProgress,
} from './gymmane-nutrition.js'

describe('gymmane-nutrition', () => {
  it('parses foods.tsv rows into structured food entries', () => {
    const sample = [
      'id\ten\tk\tp\tc\tf\tfi\tsu\tna\tml\tkind\tg\tcat',
      'p:chicken_breast\tChicken Breast\t165\t31\t0\t3.6\t0\t0\t74\t0\tpiece\t150\tprotein',
      'd:whole_milk\tWhole Milk\t61\t3.2\t4.8\t3.3\t0\t5\t43\t1\tcup\t240\tdairy',
    ].join('\n')
    const foods = parseFoodsTsv(sample)
    expect(foods).toHaveLength(2)
    expect(foods[0].slug).toBe('chicken_breast')
    expect(foods[0].photo).toBe('./smitrix-ui/food/chicken_breast.webp')
    expect(foods[0].protein).toBe(31)
    expect(foods[1].liquid).toBe(true)
  })

  it('scales and sums macros cleanly', () => {
    const scaled = scaleMacros({ kcal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 }, 200)
    expect(scaled).toEqual({ kcal: 330, protein: 62, carbs: 0, fat: 7.2, fiber: 0 })

    const sum = sumDayMacros([
      scaled,
      { kcal: 250, protein: 6, carbs: 50, fat: 2, fiber: 3.5 },
    ])
    expect(sum).toEqual({ kcal: 580, protein: 68, carbs: 50, fat: 9.2, fiber: 3.5 })
  })

  it('builds and parses offline AI meal paste lines and JSON', () => {
    const prompt = buildAiMealPrompt('chicken and rice')
    expect(prompt).toContain('chicken and rice')

    const parsed = parseAiMealText([
      'FOOD: Chicken Breast | 180g | 297 kcal | P 55.8g | C 0g | F 6.5g',
      '- Jasmine Rice | 200g | 260 kcal | P 5.4g | C 56g | F 0.6g',
    ].join('\n'))
    expect(parsed).toHaveLength(2)
    expect(parsed[0].name).toBe('Chicken Breast')
    expect(parsed[0].kcal).toBe(297)
    expect(parsed[1].carbs).toBe(56)

    const jsonParsed = parseAiMealText('[{"name":"Oats","grams":80,"kcal":304,"protein":10,"carbs":54,"fat":5}]')
    expect(jsonParsed).toHaveLength(1)
    expect(jsonParsed[0].name).toBe('Oats')
  })

  it('tracks intermittent fasting stages and completion', () => {
    const start = 1_700_000_000_000
    const at2h = fastingProgress({ startMs: start, goalHours: 16 }, start + 2 * 3600 * 1000)
    expect(at2h.done).toBe(false)
    expect(at2h.stage).toBe('Blood sugar stabilizing')

    const at17h = fastingProgress({ startMs: start, goalHours: 16 }, start + 17 * 3600 * 1000)
    expect(at17h.done).toBe(true)
    expect(at17h.pct).toBe(1)
    expect(at17h.stage).toBe('Deep cellular autophagy')
  })
})
