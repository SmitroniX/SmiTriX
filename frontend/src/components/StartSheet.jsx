import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO, exCount } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { startFlow } from '../sheets.jsx'
import Icon from './Icon.jsx'

export function openStartSheet(day = null) {
  useUI.getState().openSheet(close => <StartSheetBody day={day} close={close} />)
}

function StartSheetBody({ day, close }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const targetIso = day || todayISO()
  const todayR = effectiveRoutine(S, targetIso)
  const routines = (S.routines || []).filter(r => r && (r.ex || []).length > 0)
  const others = routines.filter(r => !todayR || r.id !== todayR.id)
  const dateObj = new Date(targetIso + 'T12:00:00')
  const dateLabel = dateObj.toLocaleDateString(dateLocale(), { weekday: 'long', month: 'short', day: 'numeric' })

  const go = fn => {
    close()
    fn()
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 3 }}>
        {day ? t('Log workout') : t('Start a workout')}
      </h2>
      <div className="muted small" style={{ marginBottom: 18, fontWeight: 600 }}>{dateLabel}</div>

      {todayR && (todayR.ex || []).length > 0 && (
        <div
          onClick={() => go(() => startFlow(todayR.id))}
          style={{
            padding: 16,
            borderRadius: 20,
            background: 'var(--ember-soft)',
            border: '1px solid color-mix(in srgb, var(--ember) 34%, transparent)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
            cursor: 'pointer',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="gm-micro" style={{ color: 'var(--gm-brass)' }}>
              {t("TODAY'S ROUTINE")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{todayR.name}</div>
            <div className="muted small" style={{ marginTop: 2 }}>{exCount((todayR.ex || []).length)}</div>
          </div>
          <span
            style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--ember)', color: 'var(--on-ember)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            }}
          >
            <Icon name="playFill" style={{ fontSize: 18, marginLeft: 2 }} />
          </span>
        </div>
      )}

      {others.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="gm-micro" style={{ margin: '0 0 8px 4px' }}>{t('YOUR ROUTINES')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {others.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => go(() => startFlow(r.id))}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 16, background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.group ? `${r.group} · ${r.name}` : r.name}</div>
                  <div className="dim small" style={{ fontSize: 11.5 }}>{exCount((r.ex || []).length)}</div>
                </div>
                <Icon name="playFill" style={{ fontSize: 14, color: 'var(--label-2)' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="gm-micro" style={{ margin: '0 0 8px 4px' }}>{t('OR START FROM')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => go(() => nav('/train'))}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16, background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left',
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--acc-soft)', color: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="target" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t('Choose focus on body map')}</div>
            <div className="dim small" style={{ fontSize: 12 }}>{t('Tap the muscles you want to train and build a session')}</div>
          </div>
          <Icon name="chevronRight" style={{ color: 'var(--label-3)' }} />
        </button>

        <button
          type="button"
          onClick={() => go(() => startFlow(null))}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16, background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left',
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--ember-soft)', color: 'var(--label)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t('Pick exercises (Freestyle)')}</div>
            <div className="dim small" style={{ fontSize: 12 }}>{t('Start an empty workout and log as you go')}</div>
          </div>
          <Icon name="chevronRight" style={{ color: 'var(--label-3)' }} />
        </button>

        <button
          type="button"
          onClick={() => go(() => nav('/plan?tab=circuits'))}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16, background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left',
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--gm-sage-soft)', color: 'var(--gm-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="timer" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t('HIIT & Circuit Timer')}</div>
            <div className="dim small" style={{ fontSize: 12 }}>{t('Timed work/rest rounds with audio cues')}</div>
          </div>
          <Icon name="chevronRight" style={{ color: 'var(--label-3)' }} />
        </button>
      </div>
    </div>
  )
}
