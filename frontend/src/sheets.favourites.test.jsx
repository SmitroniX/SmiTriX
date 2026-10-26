// @vitest-environment happy-dom
// Favourites (issue #6): the detail sheet's star writes S.favEx, and the picker floats
// favourites to the top of its list without disturbing the order of everything else.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { EXDB } from './lib/exercises.js'
import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { exerciseDetailSheet, exercisePicker } from './sheets.jsx'

const mounted = []
const S = () => useStore.getState().S

// Renders whatever sheet is on top and returns its host element.
function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

const names = host => [...host.querySelectorAll('.item .tt')].map(el => el.textContent)
const starOf = host => host.querySelector('.fav-btn')

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  useStore.setState({ S: structuredClone(DEF), user: null })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
})

describe('exercise detail star', () => {
  it('adds and removes the exercise from favourites with a toast', () => {
    const ex = EXDB[0]
    exerciseDetailSheet(ex)
    const host = renderTop()
    expect(starOf(host).getAttribute('aria-label')).toBe('Add to favourites')
    act(() => starOf(host).click())
    expect(S().favEx).toEqual([ex.id])
    expect(useUI.getState().toastMsg).toBe('Added to favourites')
    expect(starOf(host).getAttribute('aria-label')).toBe('Remove from favourites')
    expect(starOf(host).getAttribute('aria-pressed')).toBe('true')
    act(() => starOf(host).click())
    expect(S().favEx).toEqual([])
    expect(useUI.getState().toastMsg).toBe('Removed from favourites')
  })

  it('tolerates a profile written before the field existed', () => {
    useStore.setState(s => { const next = { ...s.S }; delete next.favEx; return { S: next } })
    exerciseDetailSheet(EXDB[0])
    const host = renderTop()
    act(() => starOf(host).click())
    expect(S().favEx).toEqual([EXDB[0].id])
  })
})

describe('exercise picker', () => {
  it('lists favourites first and marks them, keeping the rest in catalogue order', () => {
    const plain = names((exercisePicker(vi.fn()), renderTop())).slice(1)   // drop "Create your own"
    useUI.setState({ sheets: [] })
    const fav = [plain[7], plain[3]]
    const favIds = fav.map(n => EXDB.find(e => e.n === n).id)
    useStore.setState(s => ({ S: { ...s.S, favEx: favIds } }))
    exercisePicker(vi.fn())
    const host = renderTop()
    const shown = names(host).slice(1)
    // Favourites keep the list's own order among themselves — not the order they were starred in.
    expect(shown.slice(0, 2)).toEqual(plain.filter(n => fav.includes(n)))
    expect(shown.slice(2)).toEqual(plain.filter(n => !fav.includes(n)))
    const rows = [...host.querySelectorAll('.item')].slice(1)
    expect(rows.slice(0, 2).every(r => r.querySelector('.tt .fav-star'))).toBe(true)
    expect(rows[2].querySelector('.tt .fav-star')).toBeNull()
  })

  it('offers a Favourites chip only when there are favourites, and it filters to them', () => {
    exercisePicker(vi.fn())
    let host = renderTop()
    const chip = h => [...h.querySelectorAll('.chips .chip')].find(b => b.textContent.startsWith('Favourites'))
    expect(chip(host)).toBeUndefined()
    useUI.setState({ sheets: [] })
    useStore.setState(s => ({ S: { ...s.S, favEx: [EXDB[5].id, EXDB[9].id] } }))
    exercisePicker(vi.fn())
    host = renderTop()
    expect(chip(host).textContent).toBe('Favourites (2)')
    act(() => chip(host).click())
    expect(names(host)).toEqual([EXDB[5].n, EXDB[9].n])
  })

  it('filters exercises when clicking Chest or Back muscle chips without throwing', () => {
    exercisePicker(vi.fn())
    const host = renderTop()

    const chestChip = [...host.querySelectorAll('.chips .chip')].find(b => b.textContent.trim() === 'Chest')
    expect(chestChip).toBeDefined()
    act(() => chestChip.click())

    // Should filter to chest exercises and section title should update
    const sectionTitle = host.querySelector('.picker-section-title')?.textContent
    expect(sectionTitle).toContain('Chest')
    expect(names(host).length).toBeGreaterThan(0)

    const backChip = [...host.querySelectorAll('.chips .chip')].find(b => b.textContent.trim() === 'Back')
    expect(backChip).toBeDefined()
    act(() => backChip.click())

    const backSectionTitle = host.querySelector('.picker-section-title')?.textContent
    expect(backSectionTitle).toContain('Back')
    expect(names(host).length).toBeGreaterThan(0)
  })

  it('filters exercises using the muscle panel picker without throwing', () => {
    exercisePicker(vi.fn())
    const host = renderTop()

    // Find and click the muscle pill
    const musclePill = [...host.querySelectorAll('.picker-pill')].find(el => el.textContent.includes('Muscles') || el.textContent.includes('All Muscles'))
    expect(musclePill).toBeDefined()
    act(() => musclePill.click())

    // Panel should now be open
    const panelChips = [...host.querySelectorAll('.picker-panel-chip')]
    expect(panelChips.length).toBeGreaterThan(0)

    const chestPanelChip = panelChips.find(b => b.textContent.trim() === 'Chest')
    expect(chestPanelChip).toBeDefined()
    act(() => chestPanelChip.click())

    const sectionTitle = host.querySelector('.picker-section-title')?.textContent
    expect(sectionTitle).toContain('Chest')
    expect(names(host).length).toBeGreaterThan(0)
  })
})
