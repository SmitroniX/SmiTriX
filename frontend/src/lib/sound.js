// WebAudio beeps + haptics + synthesized rest timer chimes. `enabled` gates sound.
let audioCtx = null

export const REST_CHIMES = [
  { id: 'bell', name: 'Bell chime' },
  { id: 'beeps', name: '3-2-1 countdown beeps' },
  { id: 'gong', name: 'Gentle gong' },
  { id: 'digital', name: 'Digital chime' },
]

export function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function beep(enabled, freq, dur, when) {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = freq || 880; o.type = 'sine'
    const t0 = ctx.currentTime + (when || 0)
    g.gain.setValueAtTime(0.001, t0)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.18))
    o.start(t0); o.stop(t0 + (dur || 0.18) + 0.05)
  } catch (e) { /* */ }
}

export function playRestChime(chimeId = 'bell', enabled = true) {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    switch (chimeId) {
      case 'gong': {
        // Deep gentle resonant gong with warm harmonic partials
        const partials = [
          { f: 180, g: 0.45, d: 2.0, type: 'sine' },
          { f: 360, g: 0.22, d: 1.6, type: 'sine' },
          { f: 540, g: 0.12, d: 1.2, type: 'triangle' },
          { f: 720, g: 0.06, d: 0.8, type: 'sine' },
        ]
        partials.forEach(p => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = p.type
          osc.frequency.setValueAtTime(p.f, now)
          gain.gain.setValueAtTime(0.001, now)
          gain.gain.exponentialRampToValueAtTime(p.g, now + 0.06)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.d)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now)
          osc.stop(now + p.d + 0.05)
        })
        break
      }
      case 'digital': {
        // Modern crisp synthesizer chime arpeggio
        const notes = [587.33, 880, 1174.66, 1760]
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.09
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, t)
          gain.gain.setValueAtTime(0.001, t)
          gain.gain.exponentialRampToValueAtTime(0.28, t + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(t)
          osc.stop(t + 0.48)
        })
        break
      }
      case 'beeps': {
        // 3-2-1 countdown beeps + resolving confirmation tone
        beep(enabled, 660, 0.1, 0)
        beep(enabled, 660, 0.1, 0.22)
        beep(enabled, 660, 0.1, 0.44)
        beep(enabled, 1320, 0.35, 0.66)
        break
      }
      case 'bell':
      default: {
        // Rich crystal bell chime with natural harmonic decays
        const partials = [
          { f: 880, g: 0.38, d: 1.5 },
          { f: 1760, g: 0.2, d: 1.0 },
          { f: 2640, g: 0.1, d: 0.7 },
          { f: 3520, g: 0.04, d: 0.4 },
        ]
        partials.forEach(p => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(p.f, now)
          gain.gain.setValueAtTime(0.001, now)
          gain.gain.exponentialRampToValueAtTime(p.g, now + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.d)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now)
          osc.stop(now + p.d + 0.05)
        })
        break
      }
    }
  } catch (e) { /* ignore */ }
}

export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p) } catch (e) { /* */ } }
