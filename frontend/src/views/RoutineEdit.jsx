import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { allExercises, exOr, matchExercise, scoreExercise } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { uid, weekOrder, weekStartOf, DAYS } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { supersetUnits, moveSupersetUnit, cleanupSg, exLine, defaultConfig } from '../lib/history.js'
import { Thumb } from '../components/Media.jsx'
import { exercisePicker, exConfigSheet, confirmSheet, shareRoutineSheet, startFlow } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { copyRoutine } from '../lib/routines.js'
import BodyMap from '../components/BodyMap.jsx'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../lib/muscles.js'
import { FOLDER_HUES, folderHueFor } from '../components/GymManeMotion.jsx'

export const ROUTINE_LONG_PRESS_MS = 380
export const ROUTINE_DRAG_SLOP = 8

const ROUTINE_GROUPS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio']

const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

export function reorderRoutineUnit(exercises, sourceIndex, targetSlot) {
  if (!Array.isArray(exercises) || !exercises.length) return false
  const units = supersetUnits(exercises)
  const sourcePosition = units.findIndex(unit => unit.includes(sourceIndex))
  if (sourcePosition < 0) return false
  const remaining = units.filter((_, position) => position !== sourcePosition)
  const slot = clamp(Number.isFinite(targetSlot) ? Math.trunc(targetSlot) : sourcePosition, 0, remaining.length)
  if (slot === sourcePosition) return false
  const source = units[sourcePosition]
  const moved = exercises.splice(source[0], source.length)
  const insertAt = remaining.slice(0, slot).reduce((count, unit) => count + unit.length, 0)
  exercises.splice(insertAt, 0, ...moved)
  cleanupSg(exercises)
  return true
}

function unitGeometry(list, exercises) {
  const rows = new Map([...list.querySelectorAll('[data-routine-row]')]
    .map(row => [Number(row.dataset.exIndex), row]))
  const units = supersetUnits(exercises)
  const geometry = units.map((unit, position) => {
    const rects = unit.map(index => rows.get(index)?.getBoundingClientRect()).filter(Boolean)
    if (rects.length !== unit.length) return null
    const top = Math.min(...rects.map(rect => rect.top))
    const bottom = Math.max(...rects.map(rect => rect.bottom))
    return { unit, position, top, bottom, center: top + (bottom - top) / 2 }
  })
  return geometry.every(Boolean) ? geometry : null
}

function scrollHostFor(node) {
  for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const overflowY = window.getComputedStyle(parent).overflowY
    if (/(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight) return parent
  }
  return window
}

function autoScrollStep(host, clientY) {
  const edge = 64
  const maxStep = 14
  let top, bottom, scrollTop, maxScroll
  if (host === window) {
    const root = document.scrollingElement || document.documentElement
    top = window.visualViewport?.offsetTop || 0
    bottom = top + (window.visualViewport?.height || window.innerHeight || root.clientHeight)
    scrollTop = window.scrollY || root.scrollTop || 0
    maxScroll = Math.max(root.scrollHeight, document.body?.scrollHeight || 0) - (bottom - top)
  } else {
    const rect = host.getBoundingClientRect()
    top = rect.top; bottom = rect.bottom
    scrollTop = host.scrollTop; maxScroll = host.scrollHeight - host.clientHeight
  }
  if (clientY < top + edge && scrollTop > 0) return -Math.ceil(maxStep * clamp((top + edge - clientY) / edge, 0, 1))
  if (clientY > bottom - edge && scrollTop < maxScroll) return Math.ceil(maxStep * clamp((clientY - bottom + edge) / edge, 0, 1))
  return 0
}

function useRoutineReorder(routineIdentity, exercises, onDrop) {
  const listRef = useRef(null)
  const gestureRef = useRef(null)
  const exercisesRef = useRef(exercises)
  const routineIdentityRef = useRef(routineIdentity)
  const onDropRef = useRef(onDrop)
  const suppressClickRef = useRef(false)
  const suppressTimerRef = useRef(null)
  const [drag, setDrag] = useState(null)
  exercisesRef.current = exercises
  routineIdentityRef.current = routineIdentity
  onDropRef.current = onDrop
  const hasRows = exercises.length > 0

  useEffect(() => () => {
    suppressClickRef.current = false
    window.clearTimeout(suppressTimerRef.current)
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (!list) return undefined
    let frame = null
    setDrag(current => current ? null : current)

    const clearFrame = () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      frame = null
    }
    const clearTimer = gesture => {
      if (gesture?.timer != null) window.clearTimeout(gesture.timer)
      if (gesture) gesture.timer = null
    }
    const matchesSnapshot = gesture => routineIdentityRef.current === gesture.routineIdentity
      && exercisesRef.current === gesture.listIdentity
      && JSON.stringify(exercisesRef.current) === gesture.snapshot
    const releaseCapture = gesture => {
      const target = gesture?.captureTarget
      if (!target?.releasePointerCapture) return
      try { target.releasePointerCapture(gesture.pointerId) } catch {}
    }
    const finish = (gesture, commit, x = gesture?.lastX, y = gesture?.lastY) => {
      if (!gesture || gestureRef.current !== gesture) return
      clearTimer(gesture)
      clearFrame()
      gestureRef.current = null
      if (!gesture.active) return
      releaseCapture(gesture)
      suppressClickRef.current = true
      window.clearTimeout(suppressTimerRef.current)
      suppressTimerRef.current = window.setTimeout(() => { suppressClickRef.current = false }, 150)
      setDrag(null)
      const rect = list.getBoundingClientRect()
      const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      const geometry = unitGeometry(list, exercisesRef.current)
      if (commit && inside && geometry && matchesSnapshot(gesture) && gesture.targetSlot !== gesture.sourcePosition) {
        onDropRef.current(gesture.sourceIndex, gesture.targetSlot)
      }
    }
    const indicatorTop = (geometry, gesture, slot, listRect) => {
      if (slot === gesture.sourcePosition) return clamp(gesture.sourceTop - listRect.top, 0, listRect.height)
      const remaining = geometry.filter(unit => unit.position !== gesture.sourcePosition)
      let top
      if (slot <= 0) top = remaining[0]?.top ?? gesture.sourceTop
      else if (slot >= remaining.length) top = remaining.at(-1)?.bottom ?? gesture.sourceBottom
      else top = (remaining[slot - 1].bottom + remaining[slot].top) / 2
      return clamp(top - listRect.top, 0, listRect.height)
    }
    const updateDrag = (gesture, x, y, schedule = true) => {
      if (gestureRef.current !== gesture || !gesture.active || !matchesSnapshot(gesture)) {
        if (gestureRef.current === gesture) finish(gesture, false)
        return
      }
      const geometry = unitGeometry(list, exercisesRef.current)
      if (!geometry) { finish(gesture, false); return }
      const listRect = list.getBoundingClientRect()
      const remaining = geometry.filter(unit => unit.position !== gesture.sourcePosition)
      const probeY = clamp(y, listRect.top, listRect.bottom)
      const moved = Math.hypot(x - gesture.startX, y - gesture.startY) > ROUTINE_DRAG_SLOP
      const slot = moved ? remaining.reduce((count, unit) => count + (probeY > unit.center ? 1 : 0), 0) : gesture.sourcePosition
      const rawDelta = y - gesture.grabOffset - gesture.sourceTop
      const deltaY = clamp(rawDelta, listRect.top - gesture.sourceTop, listRect.bottom - gesture.sourceBottom)
      gesture.lastX = x; gesture.lastY = y; gesture.targetSlot = slot
      setDrag({ first: gesture.sourceUnit[0], last: gesture.sourceUnit.at(-1), deltaY, indicatorTop: indicatorTop(geometry, gesture, slot, listRect) })
      if (schedule && frame == null) frame = window.requestAnimationFrame(runAutoScroll)
    }
    function runAutoScroll() {
      frame = null
      const gesture = gestureRef.current
      if (!gesture?.active) return
      const step = autoScrollStep(gesture.scrollHost, gesture.lastY)
      if (!step) return
      if (gesture.scrollHost === window) window.scrollBy(0, step)
      else gesture.scrollHost.scrollTop += step
      updateDrag(gesture, gesture.lastX, gesture.lastY, false)
      if (gestureRef.current === gesture) frame = window.requestAnimationFrame(runAutoScroll)
    }
    const lift = gesture => {
      if (gestureRef.current !== gesture) return
      if (!matchesSnapshot(gesture)) { finish(gesture, false); return }
      const geometry = unitGeometry(list, exercisesRef.current)
      const source = geometry?.find(unit => unit.unit.includes(gesture.sourceIndex))
      if (!source) { finish(gesture, false); return }
      gesture.active = true; gesture.timer = null
      gesture.sourcePosition = source.position; gesture.sourceUnit = source.unit
      gesture.sourceTop = source.top; gesture.sourceBottom = source.bottom
      gesture.grabOffset = gesture.lastY - source.top; gesture.targetSlot = source.position
      gesture.scrollHost = scrollHostFor(list)
      gesture.captureTarget = gesture.downTarget
      try { gesture.captureTarget.setPointerCapture?.(gesture.pointerId) } catch {}
      suppressClickRef.current = true
      window.clearTimeout(suppressTimerRef.current)
      updateDrag(gesture, gesture.lastX, gesture.lastY)
    }
    const onPointerDown = event => {
      suppressClickRef.current = false
      window.clearTimeout(suppressTimerRef.current)
      const current = gestureRef.current
      if (current) {
        if (event.pointerId !== current.pointerId) finish(current, false)
        return
      }
      if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return
      const target = event.target
      if (!target?.closest || target.closest('button,a,input,textarea,select,[data-nodrag]')) return
      const row = target.closest('[data-routine-row]')
      if (!row || !list.contains(row)) return
      const sourceIndex = Number(row.dataset.exIndex)
      if (!Number.isInteger(sourceIndex)) return
      const gesture = {
        pointerId: event.pointerId, sourceIndex, downTarget: target,
        startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY,
        routineIdentity: routineIdentityRef.current,
        listIdentity: exercisesRef.current,
        snapshot: JSON.stringify(exercisesRef.current), active: false, timer: null,
      }
      gesture.timer = window.setTimeout(() => lift(gesture), ROUTINE_LONG_PRESS_MS)
      gestureRef.current = gesture
    }
    const onPointerMove = event => {
      const gesture = gestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return
      if (!gesture.active) {
        if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > ROUTINE_DRAG_SLOP) {
          clearTimer(gesture); gestureRef.current = null
        } else { gesture.lastX = event.clientX; gesture.lastY = event.clientY }
        return
      }
      event.preventDefault()
      updateDrag(gesture, event.clientX, event.clientY)
    }
    const onPointerUp = event => {
      const gesture = gestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return
      if (gesture.active) event.preventDefault()
      finish(gesture, gesture.active, event.clientX, event.clientY)
    }
    const onPointerCancel = event => {
      const gesture = gestureRef.current
      if (gesture && event.pointerId === gesture.pointerId) finish(gesture, false)
    }
    const onLostCapture = event => {
      const gesture = gestureRef.current
      if (gesture && event.pointerId === gesture.pointerId) finish(gesture, false)
    }
    const cancelActive = () => finish(gestureRef.current, false)
    const onKeyDown = event => {
      if (event.key !== 'Escape' || !gestureRef.current) return
      event.preventDefault(); cancelActive()
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') cancelActive() }
    const onContextMenu = event => { if (gestureRef.current?.active && event.target.closest?.('[data-routine-row]')) event.preventDefault() }
    const onDragStart = event => { if (event.target.closest?.('[data-routine-row]')) event.preventDefault() }
    const onTouchMove = event => { if (gestureRef.current?.active) event.preventDefault() }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('pointermove', onPointerMove, { passive: false })
    document.addEventListener('pointerup', onPointerUp, { passive: false })
    document.addEventListener('pointercancel', onPointerCancel)
    document.addEventListener('lostpointercapture', onLostCapture)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibility)
    list.addEventListener('contextmenu', onContextMenu)
    list.addEventListener('dragstart', onDragStart)
    window.addEventListener('blur', cancelActive)
    return () => {
      const gesture = gestureRef.current
      clearTimer(gesture); clearFrame(); gestureRef.current = null
      releaseCapture(gesture)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerCancel)
      document.removeEventListener('lostpointercapture', onLostCapture)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibility)
      list.removeEventListener('contextmenu', onContextMenu)
      list.removeEventListener('dragstart', onDragStart)
      window.removeEventListener('blur', cancelActive)
    }
  }, [hasRows, routineIdentity, exercises])

  const onClickCapture = event => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    window.clearTimeout(suppressTimerRef.current)
    event.preventDefault(); event.stopPropagation()
  }
  return { listRef, drag, onClickCapture }
}

export default function RoutineEdit() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const [search, setSearch] = useState('')
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r) nav('/plan') }, [!!r])
  useEffect(() => () => useStore.getState().autoBackupNow(), [])
  const edit = fn => update(s => { fn(s.routines.find(x => x.id === id).ex) })
  const reorder = useRoutineReorder(r, r?.ex || [], (sourceIndex, targetSlot) => {
    edit(exercises => { reorderRoutineUnit(exercises, sourceIndex, targetSlot) })
  })

  const inlineResults = useMemo(() => {
    const q = search.trim()
    if (!q) return []
    const existing = new Set((r?.ex || []).map(x => x.id))
    return allExercises(S)
      .filter(ex => !existing.has(ex.id) && matchExercise(ex, q))
      .sort((a, b) => scoreExercise(b, q) - scoreExercise(a, q))
      .slice(0, 12)
  }, [S, search, r?.ex])

  if (!r) return null

  const move = (i, dir) => {
    if (!moveSupersetUnit(r.ex, i, dir)) return
    edit(ex => {
      const reordered = moveSupersetUnit(ex, i, dir)
      if (!reordered) return
      ex.splice(0, ex.length, ...reordered)
      cleanupSg(ex)
    })
  }

  const toggleLink = i => edit(ex => {
    if (i < 1) return
    const cur = ex[i], prev = ex[i - 1]
    if (cur.sg && prev.sg && cur.sg === prev.sg) delete cur.sg
    else { const gid = prev.sg || ('sg' + uid()); prev.sg = gid; cur.sg = gid }
    cleanupSg(ex)
  })

  const toggleDay = dow => {
    update(s => {
      if (s.week[dow] === id) delete s.week[dow]
      else s.week[dow] = id
    })
  }

  const units = supersetUnits(r.ex)
  const unitIndex = new Map(units.flatMap((unit, index) => unit.map(i => [i, index])))
  const unitFirst = new Set(units.filter(u => u.length > 1).map(u => u[0]))
  const inSS = new Set(units.filter(u => u.length > 1).flat())
  const profile = activeProfile(S)
  const missingCount = profile ? r.ex.filter(e => !exAvailable(S, exOr(e.id))).length : 0
  const activeHue = folderHueFor(r)
  const orderDays = weekOrder(weekStartOf(S))

  return (
    <div className="narrow" style={{ paddingBottom: r.ex.length > 0 ? 110 : 32 }}>
      {/* GymMane RoutineEdit Header: Back, Borderless Title, Share / Copy / Delete */}
      <div className="hdr" style={{ alignItems: 'center', gap: 8 }}>
        <button type="button" className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Plan')}>
          <Icon name="chevronLeft" />
        </button>
        <input
          className="input"
          defaultValue={r.name}
          placeholder={t('Routine name')}
          style={{
            flex: 1, background: 'transparent', border: 'none', padding: '4px 2px',
            fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--label)',
          }}
          onChange={e => update(s => { s.routines.find(x => x.id === id).name = e.target.value.trim() || t('Routine') })}
        />
        {r.ex.length > 0 && (
          <button type="button" className="iconbtn" aria-label={t('Share routine')} onClick={() => shareRoutineSheet(r)}>
            <Icon name="share" />
          </button>
        )}
        <button
          type="button"
          className="iconbtn"
          aria-label={t('Copy routine')}
          onClick={() => {
            const copy = copyRoutine(r, t('Copy'))
            update(s => { s.routines.push(copy) })
            nav('/plan/r/' + copy.id)
          }}
        >
          <Icon name="copy" />
        </button>
        <button
          type="button"
          className="iconbtn"
          style={{ color: 'var(--red)' }}
          aria-label={t('Delete routine')}
          onClick={() => confirmSheet({
            title: t('Delete routine?'),
            message: t('“{0}” and its exercises will be removed.', r.name),
            confirmText: t('Delete'),
            danger: true,
            onConfirm: () => {
              update(s => {
                s.routines = s.routines.filter(x => x.id !== id)
                Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
                Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
              })
              nav('/plan')
            },
          })}
        >
          <Icon name="trash" />
        </button>
      </div>

      {/* 6 GymMane Folder Color Swatches */}
      <div className="gm-swatch-row" role="radiogroup" aria-label={t('Folder color')}>
        {FOLDER_HUES.map((hue, idx) => {
          const on = hue === activeHue
          return (
            <button
              key={hue}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Color ${idx + 1}`}
              className={'gm-swatch-btn' + (on ? ' on' : '')}
              onClick={() => update(s => { s.routines.find(x => x.id === id).color = idx })}
            >
              <span className="gm-swatch-dot" style={{ background: hue }} />
            </button>
          )
        })}
      </div>

      {/* 7 Weekday Schedule Toggles */}
      <div className="gm-micro" style={{ marginBottom: 8 }}>{t('SCHEDULE DAYS')}</div>
      <div className="gm-day-strip">
        {orderDays.map(dow => {
          const on = S.week?.[dow] === id
          return (
            <button
              key={dow}
              type="button"
              className={'gm-day-pill' + (on ? ' on' : '')}
              aria-pressed={on}
              onClick={() => toggleDay(dow)}
            >
              {t(DAYS[dow]).slice(0, 1).toUpperCase()}
            </button>
          )
        })}
      </div>

      {/* Routine Group Pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {ROUTINE_GROUPS.map(grp => {
          const on = r.group === grp
          return (
            <button
              key={grp}
              type="button"
              onClick={() => update(s => {
                const rt = s.routines.find(x => x.id === id)
                rt.group = rt.group === grp ? '' : grp
              })}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: on ? 'var(--acc-soft)' : 'var(--surface)',
                color: on ? 'var(--acc)' : 'var(--label-2)',
                border: on ? '1px solid var(--acc)' : '1px solid color-mix(in srgb, var(--sep) 45%, transparent)',
              }}
            >
              {t(grp)}
            </button>
          )
        })}
      </div>

      {missingCount > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--orange)' }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Icon name="warning" style={{ color: 'var(--orange)' }} />
            <div className="small">{t('{0} of {1} exercises need equipment outside "{2}"', missingCount, r.ex.length, profile.name)}</div>
          </div>
        </div>
      )}

      {/* Chosen Exercises Draggable List */}
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="gm-micro">{t('EXERCISES')} ({r.ex.length})</span>
        <button
          type="button"
          className="gm-see-all"
          onClick={() => exercisePicker((ex, quick) => {
            if (quick) {
              edit(x => x.push({ id: ex.id, ...defaultConfig(ex.id) }))
              toast(t('“{0}” added to {1}', exerciseNameFor(ex), r.name))
            } else {
              exConfigSheet(ex, null, cfg => edit(x => { x.push({ id: ex.id, ...cfg }) }), null, r)
            }
          })}
        >
          <Icon name="plus" style={{ fontSize: 12 }} /> {t('Browse all')}
        </button>
      </div>

      {r.ex.length ? (
        <div
          ref={reorder.listRef}
          onClickCapture={reorder.onClickCapture}
          className={'list routine-list' + (reorder.drag ? ' is-reordering' : '')}
        >
          {r.ex.map((e, i) => {
            const ex = exOr(e.id)
            const noEquip = profile && !exAvailable(S, ex)
            const linkedPrev = i > 0 && e.sg && r.ex[i - 1].sg === e.sg
            const isDragging = reorder.drag && i >= reorder.drag.first && i <= reorder.drag.last
            return (
              <div
                key={i}
                data-routine-row
                data-ex-index={i}
                className={'routine-drag-row' + (isDragging ? ' is-dragging' : '')}
                style={isDragging ? { transform: `translate3d(0, ${reorder.drag.deltaY}px, 0)` } : undefined}
              >
                {unitFirst.has(i) && <div className="ss-label"><Icon name="link" />{t('Superset')}</div>}
                <div
                  className={'item' + (inSS.has(i) ? ' in-ss' : '')}
                  onClick={() => {
                    exConfigSheet(ex, e, cfg => edit(x => { x[i] = { id: x[i].id, sg: x[i].sg, ...cfg } }), () => edit(x => { x.splice(i, 1); cleanupSg(x) }), r)
                  }}
                >
                  <Thumb ex={ex} />
                  <div className="grow">
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                      <div className="tt capitalize">{exerciseNameFor(ex)}</div>
                      {inSS.has(i) && <span className="tag acc" style={{ fontSize: 10, padding: '1px 6px', fontWeight: 700 }}><Icon name="link" style={{ fontSize: 9, marginRight: 3 }} />SS</span>}
                    </div>
                    <div className="ss">{exLine(e, S.unit)}</div>
                    {e.note && <div className="small dim" style={{ marginTop: 2 }}>{e.note}</div>}
                  </div>
                  {noEquip && <span className="tag" style={{ color: 'var(--orange)', borderColor: 'var(--orange)' }} title={t('Needs {0} — not in your active profile', t(ex.eq))}><Icon name="warning" /></span>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none', alignItems: 'center' }}>
                    {i > 0 && (
                      <button
                        type="button"
                        className={'iconbtn' + (linkedPrev ? ' on-ss' : '')}
                        aria-label={linkedPrev ? t('Unlink superset') : t('Superset with exercise above')}
                        title={linkedPrev ? t('Unlink superset') : t('Superset with exercise above')}
                        style={{ width: 32, height: 28, borderRadius: 8, fontSize: 15 }}
                        onClick={ev => { ev.stopPropagation(); toggleLink(i) }}
                      >
                        <Icon name="link" />
                      </button>
                    )}
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button type="button" className="iconbtn" aria-label={t('Move up')} title={t('Move up')} disabled={unitIndex.get(i) === 0} style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }} onClick={ev => { ev.stopPropagation(); move(i, -1) }}><Icon name="chevronUp" /></button>
                      <button type="button" className="iconbtn" aria-label={t('Move down')} title={t('Move down')} disabled={unitIndex.get(i) === units.length - 1} style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }} onClick={ev => { ev.stopPropagation(); move(i, 1) }}><Icon name="chevronDown" /></button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {reorder.drag && (
            <div className="routine-drop-indicator" data-testid="routine-drop-indicator" aria-hidden="true" style={{ top: `${reorder.drag.indicatorTop}px` }} />
          )}
        </div>
      ) : (
        <div className="empty" style={{ padding: '24px 16px' }}>
          <div className="ico"><Icon name="dumbbell" /></div>
          {t('No exercises yet — search below to add your first one.')}
        </div>
      )}

      {/* Inline Search & Quick-Add Exercises (GymMane exact flow) */}
      <div style={{ marginTop: 16 }}>
        <div className="search-wrap" style={{ position: 'relative' }}>
          <input
            type="search"
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Search 470+ exercises to add…')}
            aria-label={t('Search exercises')}
            style={{ borderRadius: 999, paddingLeft: 16 }}
          />
        </div>
        {inlineResults.length > 0 && (
          <div className="list" style={{ marginTop: 8 }}>
            {inlineResults.map(ex => (
              <button
                key={ex.id}
                type="button"
                className="item"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => {
                  edit(x => x.push({ id: ex.id, ...defaultConfig(ex.id) }))
                  toast(t('“{0}” added to {1}', exerciseNameFor(ex), r.name))
                }}
              >
                <Thumb ex={ex} />
                <div className="grow">
                  <div className="tt capitalize">{exerciseNameFor(ex)}</div>
                  <div className="ss">{[t(ex.tg), t(ex.eq)].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="iconbtn" style={{ width: 32, height: 32, background: 'var(--acc-soft)', color: 'var(--acc)' }}>
                  <Icon name="plus" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Muscle Coverage Preview */}
      {r.ex.length > 0 && (() => {
        const load = loadOfRoutine(r)
        const { worked } = rankOf(load)
        return (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="gm-micro" style={{ marginBottom: 8 }}>{t('WHAT THIS SESSION HITS')}</div>
            <BodyMap load={load} body={S.body} />
            <div className="mchips" style={{ marginTop: 8 }}>
              {worked.slice(0, 6).map(m => <span key={m} className="mchip">{t(MUSCLE_NAME[m])}</span>)}
            </div>
          </div>
        )
      })()}

      {/* GymMane Floating Bottom Action Bar: Save + Start Workout */}
      {r.ex.length > 0 && (
        <div className="gm-routine-floatbar">
          <Button variant="tinted" style={{ flex: 2, borderRadius: 999, height: 48 }} onClick={() => nav('/plan')}>
            {t('Save')}
          </Button>
          <Button variant="primary" icon="playFill" style={{ flex: 3, borderRadius: 999, height: 48 }} onClick={() => startFlow(r.id)}>
            {t('Start Workout')}
          </Button>
        </div>
      )}
    </div>
  )
}
