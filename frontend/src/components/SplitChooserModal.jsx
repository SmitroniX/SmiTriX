import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t, dateLocale } from '../lib/i18n.js'
import { LEGEND_PLANS, buildLegendPlan } from '../lib/legend-splits.js'
import { BODY_TYPE_PLANS, buildBodyTypePlan } from '../lib/body-type-splits.js'
import { starterPlanOptions, buildStarterPlan, starterPlanDays } from '../lib/starter.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { useUI } from '../store/useUI.js'
import { DAYN } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n-core.js'

export default function SplitChooserModal({ close, initialCategory = 'legend' }) {
  const [tab, setTab] = useState(initialCategory) // 'legend' | 'body-type' | 'classic'
  const week = useStore(s => s.S.week)
  const routines = useStore(s => s.S.routines)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const dayList = days => new Intl.ListFormat(dateLocale()).format(days.map(d => t(DAYN[d])))

  const handleLoadPlan = (planId, name, planType) => {
    let built = null
    let days = []

    if (planType === 'legend') {
      built = buildLegendPlan(planId)
      days = LEGEND_PLANS[planId]?.schedule.map(([d]) => d) || []
    } else if (planType === 'body-type') {
      built = buildBodyTypePlan(planId)
      days = BODY_TYPE_PLANS[planId]?.schedule.map(([d]) => d) || []
    } else {
      built = buildStarterPlan(planId)
      days = starterPlanDays(planId) || []
    }

    if (!built) return

    const apply = () => {
      update(st => {
        st.routines.push(...built.routines)
        built.schedule.forEach(({ day, routineId }) => {
          st.week[day] = routineId
        })
      })
      toast(t('{0} loaded into your Plan!', name))
      close()
    }

    const taken = day => week[day] && routines.some(r => r.id === week[day])
    if (days.some(taken)) {
      confirmSheet({
        title: t('Load {0}?', name),
        message: t('The new split will be scheduled on {0}. Existing routines are kept — only those days of your schedule change.', dayList(days)),
        confirmText: t('Load split'),
        onConfirm: apply
      })
    } else {
      apply()
    }
  }

  const classicCopy = {
    ppl: { name: t('Push / Pull / Legs'), about: t('Push, pull and legs each get their own focused day.') },
    'upper-lower': { name: t('Upper / Lower'), about: t('Upper body twice, lower body twice each week.') },
    'full-body': { name: t('Full Body'), about: t('Three balanced sessions hitting the entire body each time.') },
    '5x5': { name: t('5×5 Power'), about: t('Five sets of five on the foundational barbell lifts.') }
  }

  return (
    <div className="split-chooser-modal" style={{ padding: '4px 0' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkles" style={{ color: 'var(--acc)' }} />
            {t('Workout Splits & Legend Presets')}
          </h3>
          <div className="small dim" style={{ marginTop: 2 }}>
            {t('Proven training splits, somatotype programs, and Golden Era blueprints')}
          </div>
        </div>
        <button className="iconbtn" onClick={close} aria-label="Close"><Icon name="xmark" /></button>
      </div>

      {/* Tabs */}
      <div className="seg" style={{ '--n': 3, marginBottom: 16 }}>
        <button className={tab === 'legend' ? 'on' : ''} onClick={() => setTab('legend')}>
          <Icon name="trophy" />
          <span>{t('Old Legends')}</span>
        </button>
        <button className={tab === 'body-type' ? 'on' : ''} onClick={() => setTab('body-type')}>
          <Icon name="dna" />
          <span>{t('Body Types')}</span>
        </button>
        <button className={tab === 'classic' ? 'on' : ''} onClick={() => setTab('classic')}>
          <Icon name="barbell" />
          <span>{t('Classics')}</span>
        </button>
      </div>

      {/* Content Area */}
      <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }}>
        {/* TAB 1: OLD LEGENDS */}
        {tab === 'legend' && Object.values(LEGEND_PLANS).map(plan => (
          <div
            key={plan.id}
            className="split-card"
            style={{
              background: 'var(--surface-2)',
              borderRadius: 16,
              padding: '16px',
              border: '1px solid var(--sep-op)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <span className="tag" style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#ffd700', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginBottom: 4, display: 'inline-flex' }}>
                  {plan.badge} · {plan.era}
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: 'var(--acc)', fontWeight: 600 }}>{plan.legend}</div>
              </div>
              <span className="tag acc" style={{ fontSize: 11, fontWeight: 700 }}>
                {t('{0} days / wk', plan.days)}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--label-2)', lineHeight: 1.4 }}>
              {plan.about}
            </p>

            {plan.philosophy && (
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 10, borderLeft: '3px solid var(--acc)', fontStyle: 'italic', fontSize: 12, color: 'var(--label-3)' }}>
                {plan.philosophy}
              </div>
            )}

            {/* Routines Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--label-3)', textTransform: 'uppercase' }}>
                {t('Included Routines')} ({plan.routines.length}):
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {plan.routines.map(([, rName, emoji]) => (
                  <span key={rName} className="tag dim" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name={emoji} style={{ fontSize: 12 }} />
                    {rName}
                  </span>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon="sparkles"
              onClick={() => handleLoadPlan(plan.id, plan.name, 'legend')}
              style={{ marginTop: 4 }}
            >
              {t('Load this Legend Split')}
            </Button>
          </div>
        ))}

        {/* TAB 2: BODY TYPE WORKOUTS */}
        {tab === 'body-type' && Object.values(BODY_TYPE_PLANS).map(plan => (
          <div
            key={plan.id}
            className="split-card"
            style={{
              background: 'var(--surface-2)',
              borderRadius: 16,
              padding: '16px',
              border: '1px solid var(--sep-op)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <span className="tag" style={{ background: 'rgba(48, 209, 88, 0.15)', color: 'var(--acc)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginBottom: 4, display: 'inline-flex' }}>
                  🧬 {plan.bodyType} Somatotype
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: 'var(--label-3)', fontWeight: 500 }}>{plan.tagline}</div>
              </div>
              <span className="tag acc" style={{ fontSize: 11, fontWeight: 700 }}>
                {t('{0} days / wk', plan.days)}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--label-2)', lineHeight: 1.4 }}>
              {plan.about}
            </p>

            {plan.tips && (
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 10, fontSize: 12, color: 'var(--label-2)' }}>
                <div style={{ fontWeight: 700, color: 'var(--acc)', marginBottom: 4 }}>{t('Physiological Training Rules')}:</div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {plan.tips.map((tip, idx) => <li key={idx} style={{ marginBottom: 2 }}>{tip}</li>)}
                </ul>
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              icon="dna"
              onClick={() => handleLoadPlan(plan.id, plan.name, 'body-type')}
              style={{ marginTop: 4 }}
            >
              {t('Apply {0} Protocol', plan.bodyType)}
            </Button>
          </div>
        ))}

        {/* TAB 3: CLASSICS */}
        {tab === 'classic' && starterPlanOptions().map(({ id, days }) => {
          const info = classicCopy[id] || { name: id, about: '' }
          return (
            <div
              key={id}
              className="split-card"
              style={{
                background: 'var(--surface-2)',
                borderRadius: 16,
                padding: '16px',
                border: '1px solid var(--sep-op)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div className="row between">
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{info.name}</div>
                <span className="tag dim" style={{ fontSize: 11, fontWeight: 700 }}>{t('{0} days / wk', days)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--label-2)' }}>{info.about}</p>
              <Button
                variant="tinted"
                size="sm"
                icon="plus"
                onClick={() => handleLoadPlan(id, info.name, 'classic')}
                style={{ marginTop: 4 }}
              >
                {t('Load {0}', info.name)}
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
