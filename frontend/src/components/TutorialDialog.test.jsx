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
  TutorialWelcomeCard
} from './TutorialDialog.jsx'
import { useUI } from '../store/useUI.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('Tutorial System', () => {
  let container = null
  let root = null

  beforeEach(() => {
    localStorage.clear()
    resetTutorialSeen()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      act(() => root.unmount())
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
    useUI.setState({ sheets: [] })
  })

  describe('Storage flags', () => {
    it('hasSeenTutorial is false by default', () => {
      expect(hasSeenTutorial()).toBe(false)
    })

    it('markTutorialSeen sets the flag in localStorage', () => {
      markTutorialSeen()
      expect(hasSeenTutorial()).toBe(true)
      expect(localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBe('1')
    })

    it('resetTutorialSeen clears the flag in localStorage', () => {
      markTutorialSeen()
      expect(hasSeenTutorial()).toBe(true)
      resetTutorialSeen()
      expect(hasSeenTutorial()).toBe(false)
    })
  })

  describe('TutorialDialog UI & Step Navigation', () => {
    it('renders initial welcome step', () => {
      const close = vi.fn()
      act(() => {
        root.render(<TutorialDialog initialStep={0} close={close} />)
      })

      expect(container.textContent).toContain('Welcome to SmiTriX')
      expect(container.textContent).toContain('1 of 6')
      expect(container.textContent).toContain('1. Plan your week')
      expect(container.textContent).toContain('2. Log at the gym')
      expect(container.textContent).toContain('3. Track progress')
    })

    it('navigates through steps with Next and Back buttons', () => {
      const close = vi.fn()
      act(() => {
        root.render(<TutorialDialog initialStep={0} close={close} />)
      })

      // Click Next
      const nextBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Next'))
      expect(nextBtn).toBeTruthy()
      act(() => {
        nextBtn.click()
      })

      expect(container.textContent).toContain('2 of 6')
      expect(container.textContent).toContain('Step 1: Your Weekly Plan')

      // Click Next again to go to Step 2 (Workout)
      const nextBtn2 = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Next'))
      act(() => {
        nextBtn2.click()
      })
      expect(container.textContent).toContain('3 of 6')
      expect(container.textContent).toContain('Step 2: Logging a Workout')

      // Click Back to return to Step 1
      const backBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Back'))
      expect(backBtn).toBeTruthy()
      act(() => {
        backBtn.click()
      })
      expect(container.textContent).toContain('2 of 6')
      expect(container.textContent).toContain('Step 1: Your Weekly Plan')
    })

    it('jumps to a specific step when initialStep is specified', () => {
      const close = vi.fn()
      act(() => {
        root.render(<TutorialDialog initialStep={2} close={close} />)
      })

      expect(container.textContent).toContain('3 of 6')
      expect(container.textContent).toContain('Step 2: Logging a Workout')
    })

    it('clicking Skip tour marks tutorial seen and closes dialog', () => {
      const close = vi.fn()
      act(() => {
        root.render(<TutorialDialog initialStep={0} close={close} />)
      })

      const skipBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Skip tour'))
      expect(skipBtn).toBeTruthy()
      act(() => {
        skipBtn.click()
      })

      expect(close).toHaveBeenCalledTimes(1)
      expect(hasSeenTutorial()).toBe(true)
    })

    it('clicking Got it on the final step marks tutorial seen and closes dialog', () => {
      const close = vi.fn()
      act(() => {
        root.render(<TutorialDialog initialStep={5} close={close} />)
      })

      expect(container.textContent).toContain('6 of 6')
      expect(container.textContent).toContain('You’re Ready to Go!')

      const gotItBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Got it!'))
      expect(gotItBtn).toBeTruthy()
      act(() => {
        gotItBtn.click()
      })

      expect(close).toHaveBeenCalledTimes(1)
      expect(hasSeenTutorial()).toBe(true)
    })
  })

  describe('openTutorial', () => {
    it('opens a center modal sheet in useUI', () => {
      expect(useUI.getState().sheets.length).toBe(0)
      openTutorial(1)
      const sheets = useUI.getState().sheets
      expect(sheets.length).toBe(1)
      expect(sheets[0].kind).toBe('center')
    })
  })

  describe('TutorialWelcomeCard', () => {
    it('renders greeting and dismiss button', () => {
      const onDismiss = vi.fn()
      act(() => {
        root.render(<TutorialWelcomeCard onDismiss={onDismiss} />)
      })

      expect(container.textContent).toContain('New to SmiTriX?')
      expect(container.textContent).toContain('Start Tour')

      const dismissBtn = container.querySelector('button[aria-label="Dismiss"]')
      expect(dismissBtn).toBeTruthy()
      act(() => {
        dismissBtn.click()
      })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })
})
