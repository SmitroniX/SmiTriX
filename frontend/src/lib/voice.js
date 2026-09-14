// Spoken voice cues via SpeechSynthesis API.
// Gated strictly by enabled flag (voiceCoach is false/off by default in store).
// First-time enable asks user confirmation in Settings.

let utterQueue = []
let speaking = false

function processQueue() {
  if (speaking || !utterQueue.length) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    utterQueue = []
    return
  }
  speaking = true
  const item = utterQueue.shift()
  try {
    const Utterance = window.SpeechSynthesisUtterance || globalThis.SpeechSynthesisUtterance
    const u = Utterance ? new Utterance(item.text) : { text: item.text }
    u.rate = item.opts?.rate || 1.05
    u.pitch = item.opts?.pitch || 1.0
    u.volume = item.opts?.volume || 0.9
    u.lang = item.opts?.lang || 'en-US'
    u.onend = () => { speaking = false; processQueue() }
    u.onerror = () => { speaking = false; processQueue() }
    window.speechSynthesis.speak(u)
  } catch (e) {
    speaking = false
    processQueue()
  }
}

export function speak(enabled, text, opts) {
  if (!enabled || !text) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  utterQueue.push({ text, opts })
  processQueue()
}

export function cancelSpeech() {
  utterQueue = []
  speaking = false
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel() } catch (e) { /* noop */ }
  }
}

// Spoken cues for rest countdown & set notifications
export function announceRest(enabled, sec) {
  if (!enabled || !(sec > 0)) return
  cancelSpeech()
  speak(enabled, `Rest, ${sec} seconds`)
}

export function announceRestCountdown(enabled, sec) {
  if (!enabled) return
  if (sec === 10) speak(enabled, 'Ten seconds')
  else if (sec === 5) speak(enabled, 'Five')
  else if (sec === 3) speak(enabled, 'Three')
  else if (sec === 2) speak(enabled, 'Two')
  else if (sec === 1) speak(enabled, 'One')
}

export function announceRestDone(enabled) {
  if (!enabled) return
  cancelSpeech()
  speak(enabled, 'Rest over! Next set.')
}

export function announceSetComplete(enabled, setNum) {
  if (!enabled) return
  speak(enabled, `Set ${setNum} done`)
}

export function announceWorkoutComplete(enabled, prCount = 0) {
  if (!enabled) return
  cancelSpeech()
  if (prCount > 0) {
    speak(enabled, `Workout complete! You set ${prCount} new personal record${prCount > 1 ? 's' : ''}! Awesome work!`)
  } else {
    speak(enabled, 'Workout complete! Great job!')
  }
}
