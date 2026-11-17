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

const openSplitChooser = () => import('../sheets.jsx').then(m => m.splitChooserSheet?.())
const openImportRoutine = () => import('../sheets.jsx').then(m => m.importRoutineSheet?.())
const openShareRoutine = r => import('../sheets.jsx').then(m => m.shareRoutineSheet?.(r))
const openStartFlow = id => import('../sheets.jsx').then(m => m.startFlow?.(id))
const openRoutineMenu = (title, subtitle, items) => import('../sheets.jsx').then(m => m.menuSheet?.({ title, subtitle, items }))
const openConfirm = opts => import('../sheets.jsx').then(m => m.confirmSheet?.(opts))

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const config = useStore(s => s.config)
  const coachMode = useStore(s => s.coachLocal?.mode)
  const user = useStore(s => s.user)

  /* The Coach's only entry point in the app. Its screens have existed since the UI landed and
     nothing linked to them, so the feature was reachable only by typing the URL — enabled,
     configured, and invisible. The same predicate every other Coach surface uses gates it, so
     an instance without the feature sees exactly the Plan screen it saw before. */
  const showCoach = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE, coachMode })

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  const handleRoutineMenu = (r, ev) => {
    ev?.stopPropagation?.()
    openRoutineMenu(r.name, exCount(r.ex?.length || 0), [
      { icon: 'play', label: t('Start workout'), onClick: () => openStartFlow(r.id) },
      { icon: 'pencil', label: t('Edit routine'), onClick: () => nav('/plan/r/' + r.id) },
      { icon: 'share', label: t('Share routine'), onClick: () => openShareRoutine(r) },
      {
        icon: 'copy',
        label: t('Duplicate routine'),
        onClick: () => {
          const copy = copyRoutine(r, t('Copy'))
          update(s => { s.routines.push(copy) })
          useUI.getState().toast(t('Routine duplicated'))
        }
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
          }
        })
      }
    ])
  }

  return <>
    <div className="hdr">
      <div><h1>{t('Plan')}</h1><div className="sub">{t('Your weekly routine')}</div></div>
      <div className="row" style={{ gap: 6 }}>
        <button className="iconbtn" onClick={openSplitChooser} aria-label={t('Explore Splits & Legends')} title={t('Explore Splits & Legends')}><Icon name="sparkles" /></button>
        <button className="iconbtn" onClick={() => openTutorial(1)} aria-label={t('How planning works')} title={t('How planning works')}><Icon name="help" /></button>
        <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
      </div>
    </div>
    {showCoach && <button className="coach-cta" onClick={() => nav('/coach')}>
      <span className="coach-cta-av"><Icon name="sparkles" /></span>
      <span className="coach-cta-t">
        <b>{t('Coach')}</b>
        <span>{t('Plan design and reviews, from your own training')}</span>
      </span>
      <Icon name="chevronRight" className="coach-cta-chev" />
    </button>}

    <div className="cols"><div>
      <h4 className="sec">{t('Week schedule')}</h4>
      <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
        {weekOrder(weekStartOf(S)).map(d => {
          const r = S.routines.find(x => x.id === S.week[d])
          return <div key={d} className={'item' + (r ? ' plan-day-active' : '')} {...tappable(() => dayAssignSheet(d))}>
            <div className="grow"><div className="tt">{t(DAYN[d])}</div></div>
            {r ? <span className="tag acc"><Icon name={glyphOf(r.emoji)} />{r.name}</span> : <span className="tag dim">{t('Rest')}</span>}
            <Icon name="chevronRight" className="chev" /></div>
        })}
      </div>
    </div><div>
      <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="tinted" icon="sparkles" onClick={openSplitChooser}>{t('Splits')}</Button>
          <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
        </div>
      </div>
      {S.routines.length ? <div className="list">{S.routines.map(r => <div key={r.id} className="item" {...tappable(() => nav('/plan/r/' + r.id))}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        <button
          className="iconbtn"
          style={{ width: 32, height: 32, borderRadius: 8, color: 'var(--sub)', marginRight: 2, flexShrink: 0 }}
          onClick={ev => handleRoutineMenu(r, ev)}
          aria-label={t('Routine options')}
          title={t('Routine options')}
        >
          <Icon name="dotsVertical" />
        </button>
        <Icon name="chevronRight" className="chev" /></div>)}</div> : <>
        <div className="empty">
          <div className="ico"><Icon name="clipboard" /></div>
          {t('No routines yet.')}<br />{t('Create one or explore legendary workout splits.')}
        </div>
        <Button icon="sparkles" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
        <div style={{ height: 8 }} />
        <Button variant="tinted" icon="sparkles" onClick={openSplitChooser}>{t('Explore Splits & Legends')}</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" icon="download" onClick={openImportRoutine}>{t('Import shared routine')}</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" className="dim" icon="lightbulb" onClick={() => openTutorial(1)}>{t('How planning works (Guide)')}</Button>
      </>}
    </div></div>
  </>
}
