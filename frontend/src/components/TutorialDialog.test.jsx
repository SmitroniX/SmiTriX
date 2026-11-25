// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TUTORIAL_STORAGE_KEY,
  hasSeenTutorial,
  markTutorialSeen,
  resetTutorialSeen,
  TutorialDialog,
  openTutorial,
  TutorialWelcomeCard,
} from './TutorialDialog.jsx'
import { useUI } from '../store/useUI.js'
import { useStore, DEF } from '../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('GymMane-style 7-Step Onboarding Flow', () => {
  let container = null
  let root = null

  beforeEach(() => {
    localStorage.clear()
    resetTutorialSeen()
    useStore.setState({ S: structuredClone(DEF) })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) act(() => root.unmount())
    if (container && container.parentNode) container.parentNode.removeChild(container)
    useUI.setState({ sheets: [] })
  })

  describe('Storage flags', () => {
    it('hasSeenTutorial is false by default and toggles via mark/reset', () => {
      expect(hasSeenTutorial()).toBe(false)
      markTutorialSeen()
      expect(hasSeenTutorial()).toBe(true)
      expect(localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBe('1')
      resetTutorialSeen()
      expect(hasSeenTutorial()).toBe(false)
    })
  })

  describe('7-Step Onboarding Navigation & State', () => {
    it('renders GymMane-style SmiTriX Welcome step with 3 promises', () => {
      const close = vi.fn()
      act(() => { root.render(<TutorialDialog initialStep={0} close={close} />) })
      expect(container.textContent).toContain('SmiTriX')
      expect(container.textContent).toContain('Free forever')
      expect(container.textContent).toContain('Private & local-first')
      expect(container.textContent).toContain('Yours to take')
    })

    it('steps forward and back through Name, Photo, Units, Body, Goal and Places', () => {
      const close = vi.fn()
      act(() => { root.render(<TutorialDialog initialStep={0} close={close} />) })

      const clickNext = () => {
        const btn = Array.from(container.querySelectorAll('button')).find(b =>
          b.classList.contains('primary')
        )
        expect(btn).toBeTruthy()
        act(() => { btn.click() })
      }

      // 0 -> 1 (Name)
      clickNext()
      expect(container.textContent).toContain('What should we call you?')

      // 1 -> 2 (Photo)
      clickNext()
      expect(container.textContent).toContain('Add a profile photo')
      expect(container.textContent).toContain('Maybe later')

      // 2 -> 3 (Units)
      clickNext()
      expect(container.textContent).toContain('How do you measure weight?')
      expect(container.textContent).toContain('100')
      const lbBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Pounds'))
      act(() => { lbBtn.click() })
      expect(container.textContent).toContain('225')

      // Back to Photo
      const backBtn = container.querySelector('button[aria-label="Back"]')
      act(() => { backBtn.click() })
      expect(container.textContent).toContain('Add a profile photo')
    })

    it('saves weekly goal, unit, and equipment profile on Start training', () => {
      const close = vi.fn()
      act(() => { root.render(<TutorialDialog initialStep={5} close={close} />) })
      expect(container.textContent).toContain('Weekly training goal')

      // Pick 5 days/week
      const day5 = Array.from(container.querySelectorAll('button')).find(b => b.textContent === '5')
      act(() => { day5.click() })

      // Advance to step 6 (Places)
      const nextBtn = Array.from(container.querySelectorAll('button')).find(b => b.classList.contains('primary'))
      act(() => { nextBtn.click() })
      expect(container.textContent).toContain('Where do you train?')

      // Finish
      const startBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Start training'))
      expect(startBtn).toBeTruthy()
      act(() => { startBtn.click() })

      expect(close).toHaveBeenCalledTimes(1)
      expect(hasSeenTutorial()).toBe(true)
      expect(useStore.getState().S.weeklyTarget).toBe(5)
      expect(useStore.getState().S.onboarded).toBe(true)
      expect(useStore.getState().S.equipProfiles.length).toBeGreaterThan(0)
    })

    it('Skip marks onboarding complete and closes dialog', () => {
      const close = vi.fn()
      act(() => { root.render(<TutorialDialog initialStep={0} close={close} />) })
      const skipBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Skip')
      act(() => { skipBtn.click() })
      expect(close).toHaveBeenCalledTimes(1)
      expect(hasSeenTutorial()).toBe(true)
      expect(useStore.getState().S.onboarded).toBe(true)
    })
  })

  describe('openTutorial & TutorialWelcomeCard', () => {
    it('opens center onboarding modal in useUI', () => {
      openTutorial(1)
      const sheets = useUI.getState().sheets
      expect(sheets.length).toBe(1)
      expect(sheets[0].kind).toBe('center')
    })

    it('renders compatibility welcome card with dismiss button', () => {
      const onDismiss = vi.fn()
      act(() => { root.render(<TutorialWelcomeCard onDismiss={onDismiss} />) })
      const dismissBtn = container.querySelector('button[aria-label="Dismiss"]')
      act(() => { dismissBtn.click() })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })
})
