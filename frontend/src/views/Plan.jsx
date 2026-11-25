import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { DAYN, weekOrder, weekStartOf, uid, exCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, starterPlanSheet, planToolsSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import { coachAvailable } from '../lib/coach.js'
import { openTutorial } from '../components/TutorialDialog.jsx'
import { copyRoutine } from '../lib/routines.js'
import { exOr } from '../lib/exercises.js'
import { musclesOf, MUSCLE_NAME } from '../lib/muscles.js'
import { Rise, RoutineFolder, CollapsedHeader } from '../components/GymManeMotion.jsx'
import { CircuitSection } from '../components/CircuitTimer.jsx'

const openSplitChooser = () => import('../sheets.jsx').then(m => m.splitChooserSheet?.())
const openImportRoutine = opts => import('../sheets.jsx').then(m => m.importRoutineSheet?.(opts))
const openShareRoutine = r => import('../sheets.jsx').then(m => m.shareRoutineSheet?.(r))
const openStartFlow = id => import('../sheets.jsx').then(m => m.startFlow?.(id))
const openRoutineMenu = (title, subtitle, items) => import('../sheets.jsx').then(m => m.menuSheet?.({ title, subtitle, items }))
const openConfirm = opts => import('../sheets.jsx').then(m => m.confirmSheet?.(opts))

function initialTabFromUrl() {
  try {
    const raw = (window.location.hash.split('?')[1] || window.location.search || '').replace(/^\?/, '')
    return new URLSearchParams(raw).get('tab') === 'circuits' ? 'circuits' : 'routines'
  } catch {
    return 'routines'
  }
}

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const config = useStore(s => s.config)
  const coachMode = useStore(s => s.coachLocal?.mode)
  const user = useStore(s => s.user)
  const [tab, setTab] = useState(initialTabFromUrl)

  const showCoach = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE, coachMode })
  const scheduleMode = S.scheduleMode === 'rotation' ? 'rotation' : 'week'

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  const weekStimulus = useMemo(() => {
    const counts = {}
    const order = weekOrder(weekStartOf(S))
    for (const d of order) {
      const rId = S.week?.[d]
      if (!rId) continue
      const r = (S.routines || []).find(x => x.id === rId)
      if (!r) continue
      const seen = new Set()
      for (const e of r.ex || []) {
        const ex = exOr(e.id)
        if (!ex) continue
        for (const [slug, weight] of Object.entries(musclesOf(ex))) {
          if (weight >= 0.5 && !seen.has(slug)) {
            seen.add(slug)
            counts[slug] = (counts[slug] || 0) + 1
          }
        }
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([slug, count]) => ({ name: MUSCLE_NAME[slug] || slug, count }))
  }, [S.week, S.routines, S.weekStart])

  const handleRoutineMenu = (r, ev) => {
    ev?.stopPropagation?.()
    openRoutineMenu(r.name, exCount(r.ex?.length || 0), [
      { icon: 'playFill', label: t('Start workout'), onClick: () => openStartFlow(r.id) },
      { icon: 'pencil', label: t('Edit routine'), onClick: () => nav('/plan/r/' + r.id) },
      { icon: 'share', label: t('Share routine'), onClick: () => openShareRoutine(r) },
      {
        icon: 'copy',
        label: t('Duplicate routine'),
        onClick: () => {
          const copy = copyRoutine(r, t('Copy'))
          update(s => { s.routines.push(copy) })
          useUI.getState().toast(t('Routine duplicated'))
        },
      },
      {
        icon: 'trash',
        label: t('Delete routine'),
        danger: true,
        onClick: () => openConfirm({
          title: t('Delete {0}?', r.name),
          message: t('This will remove the routine from your plan and week schedule.'),
          confirmText: t('Delete'),
          danger: true,
          onConfirm: () => {
            update(s => {
              s.routines = s.routines.filter(x => x.id !== r.id)
              Object.keys(s.week).forEach(k => { if (s.week[k] === r.id) delete s.week[k] })
              Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === r.id) delete s.dayPlan[k] })
            })
            useUI.getState().toast(t('Routine deleted'))
          },
        }),
      },
    ])
  }

  const addRotationStep = () => {
    const routines = S.routines || []
    openRoutineMenu(t('Add step to rotation'), t('Choose a routine or a rest day'), [
      ...routines.map(r => ({
        icon: glyphOf(r.emoji),
        label: r.name,
        onClick: () => update(s => {
          s.rotationSteps = [...(s.rotationSteps || []), { type: 'routine', id: r.id }]
        }),
      })),
      {
        icon: 'bed',
        label: t('Rest day'),
        onClick: () => update(s => {
          s.rotationSteps = [...(s.rotationSteps || []), { type: 'rest' }]
        }),
      },
    ])
  }

  return (
    <div className="narrow">
      <CollapsedHeader title={t('Routines')} />

      {/* GymMane Routines Header */}
      <div className="hdr" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="iconbtn" onClick={() => nav('/home')} aria-label={t('Back')}>
            <Icon name="chevronLeft" />
          </button>
          <div>
            <h1 style={{ fontSize: 26 }}>{t('Routines')}</h1>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="iconbtn" onClick={() => nav('/ai-plan')} aria-label={t('AI Routine Builder')} title={t('AI Routine Builder')}><Icon name="sparkles" /></button>
          <button className="iconbtn" onClick={() => openImportRoutine({ startScanning: true })} aria-label={t('Scan Routine QR')} title={t('Scan Routine QR')}><Icon name="qr" /></button>
          <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
        </div>
      </div>

      {/* Mode Tabs: Routines | Circuits */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', padding: 4, borderRadius: 999, marginBottom: 18 }}>
        {[
          { id: 'routines', label: t('Routines & Plan') },
          { id: 'circuits', label: t('Circuits & HIIT') },
        ].map(x => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            style={{
              flex: 1, height: 38, borderRadius: 999, fontSize: 13.5, fontWeight: 800,
              background: tab === x.id ? 'var(--ember)' : 'transparent',
              color: tab === x.id ? 'var(--on-ember)' : 'var(--label-2)',
              transition: 'background 180ms, color 180ms',
            }}
          >
            {x.label}
          </button>
        ))}
      </div>

      {showCoach && (
        <button className="coach-cta" onClick={() => nav('/coach')}>
          <span className="coach-cta-av"><Icon name="sparkles" /></span>
          <span className="coach-cta-t">
            <b>{t('Coach')}</b>
            <span>{t('Plan design and reviews, from your own training')}</span>
          </span>
          <Icon name="chevronRight" className="coach-cta-chev" />
        </button>
      )}

      {tab === 'circuits' ? (
        <Rise index={0}>
          <CircuitSection />
        </Rise>
      ) : (
        <>
          {/* Weekly Plan / Rotation Toggle Header (exact 07-routines.png!) */}
          <Rise index={0}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <span className="gm-micro">{scheduleMode === 'week' ? t('WEEKLY PLAN') : t('ROTATION')}</span>
              <div style={{ display: 'inline-flex', background: 'var(--surface)', padding: 3, borderRadius: 999 }}>
                {[
                  { id: 'week', label: t('Fixed week') },
                  { id: 'rotation', label: t('Rotation') },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => update(s => { s.scheduleMode = m.id })}
                    style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800,
                      background: scheduleMode === m.id ? 'var(--ember)' : 'transparent',
                      color: scheduleMode === m.id ? 'var(--on-ember)' : 'var(--label-2)',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {scheduleMode === 'week' ? (
              <div className="card" style={{ padding: '6px 14px', marginBottom: 12 }}>
                {weekOrder(weekStartOf(S)).map((d, idx) => {
                  const r = (S.routines || []).find(x => x.id === S.week?.[d])
                  return (
                    <div
                      key={d}
                      className="item"
                      {...tappable(() => dayAssignSheet(d))}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 2px', cursor: 'pointer', background: 'transparent', borderRadius: 0, minHeight: 0,
                        borderTop: idx > 0 ? '1px solid color-mix(in srgb, var(--sep) 35%, transparent)' : 'none',
                      }}
                    >
                      <span className="tt" style={{ fontSize: 14.5, fontWeight: 800 }}>{t(DAYN[d])}</span>
                      <div className="row" style={{ gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: r ? 'var(--label)' : 'var(--label-3)' }}>
                          {r ? r.name : t('Rest day')}
                        </span>
                        <Icon name="chevronRight" style={{ fontSize: 13, color: 'var(--label-3)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="muted small" style={{ marginBottom: 10 }}>
                  {t('Cycle through workouts in order without tying them to weekdays.')}
                </div>
                {(S.rotationSteps || []).length === 0 ? (
                  <div className="dim small" style={{ marginBottom: 12 }}>{t('No rotation steps yet.')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {(S.rotationSteps || []).map((st, idx) => {
                      const r = st.type === 'routine' ? (S.routines || []).find(x => x.id === st.id) : null
                      const isCur = idx === ((S.rotationStep || 0) % S.rotationSteps.length)
                      return (
                        <div key={idx} className="row between" style={{ padding: '9px 12px', borderRadius: 12, background: isCur ? 'var(--acc-soft)' : 'var(--surface-2)' }}>
                          <div className="row" style={{ gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: isCur ? 'var(--acc)' : 'var(--label-3)' }}>#{idx + 1}</span>
                            <span style={{ fontSize: 14, fontWeight: 800 }}>{st.type === 'rest' ? t('Rest day') : (r?.name || t('Routine'))}</span>
                          </div>
                          <button
                            type="button"
                            className="iconbtn"
                            style={{ width: 28, height: 28, fontSize: 13 }}
                            onClick={() => update(s => { s.rotationSteps = s.rotationSteps.filter((_, i) => i !== idx) })}
                          >
                            <Icon name="xmark" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <button type="button" className="btn sm" onClick={addRotationStep}>
                  <Icon name="plus" /> {t('Add step')}
                </button>
              </div>
            )}

            <div className="row" style={{ gap: 8, marginBottom: 16 }}>
              <button type="button" className="gm-see-all" style={{ height: 34, padding: '0 14px' }} onClick={addRoutine}>
                <Icon name="plus" style={{ fontSize: 13 }} /> {t('New routine')}
              </button>
              <button type="button" className="gm-see-all" style={{ height: 34, padding: '0 14px' }} onClick={openSplitChooser}>
                <Icon name="sparkles" style={{ fontSize: 13, color: 'var(--acc)' }} /> {t('Templates')}
              </button>
              <button type="button" className="gm-see-all" style={{ height: 34, padding: '0 14px' }} onClick={() => nav('/ai-plan')}>
                <Icon name="bolt" style={{ fontSize: 13, color: 'var(--gm-sage)' }} /> {t('AI Plan')}
              </button>
            </div>
          </Rise>

          {/* Weekly Muscle Frequency Mini-Strip */}
          {weekStimulus.length > 0 && (
            <div className="card" style={{ padding: '12px 14px', marginBottom: 18 }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="gm-micro">{t('WEEKLY MUSCLE FREQUENCY')}</span>
                <span style={{ fontSize: 11, color: 'var(--acc)', fontWeight: 700 }}>{t('Optimal: 2× / week')}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {weekStimulus.map(m => (
                  <span key={m.name} className="tag acc" style={{ fontSize: 11, padding: '3px 9px' }}>
                    {m.name} <strong>{m.count}×</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3D Stacked RoutineFolder 2-Column Grid */}
          <Rise index={1}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="gm-micro">{t('YOUR ROUTINES ({0})', (S.routines || []).length)}</span>
              <button type="button" className="gm-see-all" onClick={() => openTutorial(1)}>
                <Icon name="help" style={{ fontSize: 13 }} /> {t('Guide')}
              </button>
            </div>

            {(S.routines || []).length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(162px, 1fr))', gap: 12 }}>
                {S.routines.map(r => (
                  <RoutineFolder
                    key={r.id}
                    routine={r}
                    onOpen={() => nav('/plan/r/' + r.id)}
                    onStart={() => openStartFlow(r.id)}
                    onMenu={ev => handleRoutineMenu(r, ev)}
                  />
                ))}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 32, color: 'var(--label-3)', marginBottom: 8 }}><Icon name="clipboard" /></div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{t('No routines yet')}</div>
                <div className="muted small" style={{ marginBottom: 16 }}>{t('Create one, load a starter split, or paste an AI plan.')}</div>
                <Button variant="primary" icon="sparkles" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
                <div style={{ height: 8 }} />
                <Button variant="tinted" icon="sparkles" onClick={openSplitChooser}>{t('Explore Splits & Legends')}</Button>
                <div style={{ height: 8 }} />
                <Button variant="ghost" icon="download" onClick={() => openImportRoutine()}>{t('Import shared routine')}</Button>
              </div>
            )}
          </Rise>
        </>
      )}
    </div>
  )
}
