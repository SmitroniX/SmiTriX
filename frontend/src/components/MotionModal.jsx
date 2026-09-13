import { useState } from 'react'
import { imgSrc, gifSrc, smOf } from '../lib/exercises.js'
import { t, exerciseNameFor, instrFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function MotionModal({ ex, onClose }) {
  const [playing, setPlaying] = useState(true)
  const [activeStep, setActiveStep] = useState(0)
  const steps = instrFor(ex)
  const primary = ex.primaries?.length ? ex.primaries : (ex.tg ? [ex.tg] : [])
  const secondary = (ex.secondaries?.length ? ex.secondaries : smOf(ex)).slice(0, 4)

  return (
    <div className="motion-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="motion-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="motion-modal-hdr">
          <div className="motion-modal-title">
            <span className="motion-pill"><Icon name="play" /> {t('Motion Guide')}</span>
            <h3 className="capitalize">{exerciseNameFor(ex)}</h3>
          </div>
          <button className="iconbtn motion-modal-close" onClick={onClose} aria-label={t('Close')}>
            <Icon name="xmark" />
          </button>
        </div>

        <div className="motion-player-stage">
          <img
            decoding="async"
            draggable={false}
            src={playing ? gifSrc(ex) : imgSrc(ex)}
            alt={exerciseNameFor(ex)}
            className="motion-player-media"
          />
          <div className="motion-player-overlay">
            <button
              type="button"
              className="motion-player-playbtn"
              onClick={() => setPlaying(p => !p)}
              aria-label={playing ? t('Pause') : t('Play')}
            >
              <Icon name={playing ? 'pause' : 'play'} />
              <span>{playing ? t('Pause') : t('Play motion')}</span>
            </button>
          </div>
        </div>

        <div className="motion-tags-row">
          {ex.bp && <span className="tag acc"><Icon name="target" />{t(ex.bp)}</span>}
          {primary.map((m, i) => <span key={i} className="tag acc-sub"><Icon name="bolt" />{t(m)}</span>)}
          {ex.eq && <span className="tag"><Icon name="dumbbell" />{t(ex.eq)}</span>}
          {secondary.map((m, i) => <span key={i} className="tag muted-tag">{t(m)}</span>)}
        </div>

        {steps.length > 0 && (
          <div className="motion-steps-card">
            <div className="motion-steps-hdr">
              <span className="motion-steps-title"><Icon name="check" /> {t('Step-by-Step Technique')}</span>
              <span className="dim small">{steps.length} {t('steps')}</span>
            </div>
            <div className="motion-steps-list">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={'motion-step-item' + (activeStep === i ? ' active' : '')}
                  onClick={() => setActiveStep(i)}
                >
                  <span className="motion-step-num">{i + 1}</span>
                  <div className="motion-step-text">{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="motion-pro-tip">
          <Icon name="lightbulb" className="tip-ico" />
          <div>
            <b>{t('Pro Form Cue')}:</b> {t('Control the eccentric lowering phase for 2–3 seconds, maintain a solid brace, and exhale forcefully through the concentric effort.')}
          </div>
        </div>

        <Button variant="primary" style={{ marginTop: 14 }} onClick={onClose}>
          {t('Got it')}
        </Button>
      </div>
    </div>
  )
}
