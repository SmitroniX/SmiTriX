// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  speak,
  cancelSpeech,
  announceRest,
  announceRestCountdown,
  announceRestDone,
  announceSetComplete,
  announceWorkoutComplete,
} from './voice.js'

describe('voice coach library', () => {
  let speakMock
  let cancelMock

  beforeEach(() => {
    cancelSpeech()
    speakMock = vi.fn()
    cancelMock = vi.fn()
    window.speechSynthesis = {
      speak: (u) => {
        speakMock(u)
        u.onend?.()
      },
      cancel: () => {
        cancelMock()
      },
    }
  })


  it('does not speak when enabled is false', () => {
    speak(false, 'Hello')
    expect(speakMock).not.toHaveBeenCalled()
  })

  it('speaks text when enabled is true', () => {
    speak(true, 'Hello world')
    expect(speakMock).toHaveBeenCalled()
  })

  it('cancels speech queue on cancelSpeech', () => {
    cancelSpeech()
    expect(cancelMock).toHaveBeenCalled()
  })

  it('announces rest correctly', () => {
    announceRest(true, 90)
    expect(speakMock).toHaveBeenCalled()
  })

  it('announces rest countdown milestones', () => {
    announceRestCountdown(true, 10)
    expect(speakMock).toHaveBeenCalled()
    speakMock.mockClear()

    announceRestCountdown(true, 5)
    expect(speakMock).toHaveBeenCalled()
    speakMock.mockClear()

    announceRestCountdown(true, 3)
    expect(speakMock).toHaveBeenCalled()
    speakMock.mockClear()

    announceRestCountdown(true, 7) // unannounced milestone
    expect(speakMock).not.toHaveBeenCalled()
  })

  it('announces rest over', () => {
    announceRestDone(true)
    expect(speakMock).toHaveBeenCalled()
  })

  it('announces set completion', () => {
    announceSetComplete(true, 2)
    expect(speakMock).toHaveBeenCalled()
  })

  it('announces workout complete with PR count', () => {
    announceWorkoutComplete(true, 3)
    expect(speakMock).toHaveBeenCalled()
    speakMock.mockClear()

    announceWorkoutComplete(true, 0)
    expect(speakMock).toHaveBeenCalled()
  })
})
