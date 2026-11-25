import { useEffect } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { Button } from './ui.jsx'
import { RollingText } from './GymManeMotion.jsx'

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

export default function RestTimer() {
  const timer = useUI(s => s.timer)
  const work = useUI(s => s.work)
  const { addRest, stopRest, finishWorkEarly, stopWork } = useUI()
  const on = work || timer

  useEffect(() => {
    document.body.classList.toggle('resting', !!on)
    return () => document.body.classList.remove('resting')
  }, [!!on])

  if (!on) return null

  const pct = Math.max(0, Math.min(100, (on.left / Math.max(1, on.total)) * 100))
  const ticks = 28
  const drained = Math.floor(((100 - pct) / 100) * ticks)

  if (work) {
    return (
      <div id="timer" className="working" style={{ borderRadius: 24, borderColor: 'color-mix(in srgb, var(--acc) 45%, transparent)' }}>
        <div className="t"><RollingText value={clock(work.left)} countsDown={true} /></div>
        <div className="grow">
          {work.label && <div className="lbl" style={{ fontWeight: 700 }}>{work.label}</div>}
          <div style={{ display: 'flex', gap: 2.5, alignItems: 'center', height: 14, marginTop: 4 }}>
            {Array.from({ length: 20 }, (_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: i < Math.floor(((100 - pct) / 100) * 20) ? 7 : 13,
                  borderRadius: 2,
                  background: i < Math.floor(((100 - pct) / 100) * 20) ? 'var(--surface-2)' : 'var(--acc)',
                  transition: 'height 300ms ease, background 300ms ease',
                }}
              />
            ))}
          </div>
        </div>
        <Button size="sm" onClick={stopWork}>{t('Cancel')}</Button>
        <Button size="sm" variant="primary" icon="check" onClick={finishWorkEarly}>{t('Done')}</Button>
      </div>
    )
  }

  const isUrgent = timer && timer.left <= 5
  const tickColor = isUrgent ? 'var(--gm-danger)' : 'var(--gm-sage)'
  return (
    <div id="timer" className={'rest' + (isUrgent ? ' urgent' : '')} style={{ borderRadius: 26, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, height: 16, marginBottom: 8 }}>
        {Array.from({ length: ticks }, (_, i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: i < drained ? 9 : 16,
              borderRadius: 2,
              background: i < drained ? 'var(--surface-2)' : tickColor,
              transition: 'height 320ms ease, background-color 320ms ease',
            }}
          />
        ))}
      </div>
      <div className="head" style={{ marginBottom: 8 }}>
        <div className="t" style={{ fontSize: 24, fontWeight: 900 }}>
          <RollingText value={clock(timer.left)} countsDown={true} />
        </div>
        <div className="gm-micro" style={{ color: tickColor, flex: 1, textAlign: 'right' }}>
          {t('RESTING')}
        </div>
      </div>
      <div className="acts">
        <Button size="sm" icon="minus" onClick={() => addRest(-15)}>15s</Button>
        <Button size="sm" icon="plus" onClick={() => addRest(15)}>15s</Button>
        <Button size="sm" icon="plus" onClick={() => addRest(30)}>30s</Button>
        <Button size="sm" variant="primary" className="skip" onClick={stopRest}>{t('Skip')}</Button>
      </div>
    </div>
  )
}
