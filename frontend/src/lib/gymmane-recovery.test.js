import { describe, expect, it } from 'vitest'
import { RECOVERY_KINDS, BREATH_PATTERNS, summarizeRecoveryWeek } from './gymmane-recovery.js'

describe('gymmane-recovery', () => {
  it('provides 4 recovery kinds and 4 guided breathing patterns', () => {
    expect(RECOVERY_KINDS).toHaveLength(4)
    expect(BREATH_PATTERNS).toHaveLength(4)
    expect(BREATH_PATTERNS.every(p => p.phases.length >= 2)).toBe(true)
  })

  it('aggregates weekly heat, cold, contrast, breath totals and personal records', () => {
    const S = {
      weekStart: 1,
      recovery: {
        entries: [
          { id: '1', kind: 'sauna', d: '2026-10-12', sec: 900 },
          { id: '2', kind: 'cold', d: '2026-10-13', sec: 180 },
          { id: '3', kind: 'contrast', d: '2026-10-14', sec: 600, coldSec: 120, rounds: 2 },
          { id: '4', kind: 'breath', d: '2026-10-15', sec: 300, bestHold: 7 },
          // Prior week cold record should still count for all-time bestColdSec
          { id: '5', kind: 'cold', d: '2026-09-01', sec: 240 },
        ],
      },
    }
    const res = summarizeRecoveryWeek(S, '2026-10-15')
    expect(res.sessions).toBe(4)
    expect(res.heat).toBe(900 + 600 * 2)
    expect(res.cold).toBe(180 + 120 * 2)
    expect(res.breath).toBe(300)
    expect(res.bestColdSec).toBe(240)
    expect(res.bestHoldSec).toBe(7)
  })
})
