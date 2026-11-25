import { useStore } from '../store/useStore.js'
import { t, dateLocale } from '../lib/i18n.js'
import { GYMMANE_TEMPLATES, buildStarterPlan, starterPlanDays } from '../lib/starter.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { useUI } from '../store/useUI.js'
import { DAYN } from '../lib/format.js'

const TEMPLATE_NOTES = {
  fullbody: '3 balanced full-body sessions hitting every major pattern each week.',
  ppl: 'Classic Push, Pull, and Legs split with focused volume per muscle group.',
  arnold: '6-day Chest/Back, Shoulders/Arms, and Legs hypertrophy blueprint.',
  upperlower: '4-day Upper & Lower split balancing heavy strength and accessory volume.',
  abcd: '4-day dedicated split targeting Chest/Tri, Back/Bi, Legs, and Shoulders/Abs.',
  abcde: '5-day single-focus split giving each muscle group its own dedicated day.',
  stronglifts: 'Foundational 5×5 progressive overload on squat, bench, row, press, and deadlift.',
  startingstrength: '3×5 linear strength program built around the core barbell compounds.',
  rr: 'Bodyweight calisthenics progression covering pull, squat, dip, hinge, row, and core.',
  home: 'Zero-equipment home split using push-ups, pull-ups, dips, squats, and core.',
}

export default function SplitChooserModal({ close }) {
  const week = useStore(s => s.S.week)
  const routines = useStore(s => s.S.routines)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const dayList = days => new Intl.ListFormat(dateLocale()).format(days.map(d => t(DAYN[d])))

  const handleLoadTemplate = tpl => {
    const built = buildStarterPlan(tpl.id)
    const days = starterPlanDays(tpl.id) || []
    if (!built) return

    const apply = () => {
      update(st => {
        st.routines.push(...built.routines)
        built.schedule.forEach(({ day, routineId }) => {
          st.week[day] = routineId
        })
      })
      toast(t('{0} loaded into your Plan!', tpl.name))
      close()
    }

    const taken = day => week[day] && routines.some(r => r.id === week[day])
    if (days.some(taken)) {
      confirmSheet({
        title: t('Load {0}?', tpl.name),
        message: t('The new split will be scheduled on {0}. Existing routines are kept — only those days of your schedule change.', dayList(days)),
        confirmText: t('Load split'),
        onConfirm: apply,
      })
    } else {
      apply()
    }
  }

  return (
    <div className="split-chooser-modal" style={{ padding: '4px 0' }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkles" style={{ color: 'var(--acc)' }} />
            {t('Program Templates')}
          </h3>
          <div className="small dim" style={{ marginTop: 2 }}>
            {t('10 curated splits ready to load onto your weekly schedule')}
          </div>
        </div>
        <button type="button" className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      <div style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {GYMMANE_TEMPLATES.map(tpl => {
          const uniqueDays = []
          const seen = new Set()
          tpl.days.forEach(d => {
            if (!seen.has(d.name)) { seen.add(d.name); uniqueDays.push(d) }
          })
          return (
            <div
              key={tpl.id}
              className="split-card"
              style={{
                background: 'var(--surface-2)',
                borderRadius: 16,
                padding: '14px 16px',
                border: '1px solid var(--sep-op)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div className="row between" style={{ alignItems: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--label)' }}>{tpl.name}</div>
                <span className="tag acc" style={{ fontSize: 11, fontWeight: 700 }}>
                  {t('{0} days / wk', tpl.days.length)}
                </span>
              </div>

              {TEMPLATE_NOTES[tpl.id] && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--label-2)', lineHeight: 1.4 }}>
                  {t(TEMPLATE_NOTES[tpl.id])}
                </p>
              )}

              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {uniqueDays.map(d => (
                  <span key={d.name} className="tag dim" style={{ fontSize: 11 }}>
                    {d.name} · {d.ex.length}
                  </span>
                ))}
              </div>

              <Button
                variant="tinted"
                size="sm"
                icon="plus"
                onClick={() => handleLoadTemplate(tpl)}
                style={{ marginTop: 4 }}
              >
                {t('Load {0}', tpl.name)}
              </Button>
            </div>
          )
        })}
      </div>

      <div style={{ height: 12 }} />
      <Button variant="ghost" onClick={close}>{t('Close')}</Button>
    </div>
  )
}
