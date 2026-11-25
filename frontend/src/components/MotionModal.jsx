import { useState, useEffect, useMemo } from 'react'
import { imgSrc, gifSrc, mediaUrlsFor, smOf } from '../lib/exercises.js'
import { resolveExerciseArtSlug, getCachedExerciseArt, loadExerciseArt } from '../lib/exercise-art.js'
import { t, exerciseNameFor, instrFor } from '../lib/i18n.js'
import { ExerciseArtSvg } from './Media.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function MotionModal({ ex, onClose }) {
  const slug = useMemo(() => (ex?.gif ? resolveExerciseArtSlug(ex) : null), [ex?.id, ex?.n, ex?.eq, ex?.bp, ex?.tg, ex?.gif])
  const [art, setArt] = useState(() => (slug ? getCachedExerciseArt(slug) : null))
  const [playing, setPlaying] = useState(true)
  const [viewMode, setViewMode] = useState('loop') // 'loop' | 'setup'
  const [speed, setSpeed] = useState(1)
  const [cdnIndex, setCdnIndex] = useState(0)
  const [failed, setFailed] = useState(null)
  const [loading, setLoading] = useState(!art)
  const [activeStep, setActiveStep] = useState(0)

  const steps = instrFor(ex)
  const primary = ex.primaries?.length ? ex.primaries : (ex.tg ? [ex.tg] : [])
  const secondary = (ex.secondaries?.length ? ex.secondaries : smOf(ex)).slice(0, 4)

  useEffect(() => {
    setPlaying(true)
    setViewMode('loop')
    setSpeed(1)
    setCdnIndex(0)
    setFailed(null)
    if (!slug) { setArt(null); setLoading(true); return }
    const cached = getCachedExerciseArt(slug)
    if (cached) { setArt(cached); setLoading(false); return }
    setArt(null)
    setLoading(true)
    let cancelled = false
    loadExerciseArt(slug).then(data => {
      if (!cancelled && data) { setArt(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [ex?.id, slug])

  const gifUrls = mediaUrlsFor(ex, 'gif')
  const imgUrls = mediaUrlsFor(ex, 'img')

  const currentGifUrl = gifUrls[cdnIndex] || gifUrls[0] || gifSrc(ex)
  const currentImgUrl = imgUrls[cdnIndex] || imgUrls[0] || imgSrc(ex)

  const showGif = playing && failed == null && viewMode === 'loop'
  const activeSrc = showGif ? currentGifUrl : currentImgUrl

  const onError = () => {
    if (showGif && cdnIndex < gifUrls.length - 1) { setCdnIndex(i => i + 1); return }
    if (showGif) { setCdnIndex(0); setFailed('gif'); return }
    if (cdnIndex < imgUrls.length - 1) { setCdnIndex(i => i + 1); return }
    setLoading(false)
    setFailed('all')
  }

  const handleRetry = () => {
    setFailed(null)
    setCdnIndex(0)
    setLoading(true)
    setPlaying(true)
  }

  const usingVector = !!art
  const isAnimating = usingVector ? (playing && viewMode === 'loop') : showGif

  return (
    <div className="motion-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="motion-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="motion-modal-hdr">
          <div className="motion-modal-title">
            <span className="motion-pill"><Icon name="play" /> {t('HD Motion Guide')}</span>
            <h3 className="capitalize">{exerciseNameFor(ex)}</h3>
          </div>
          <button className="iconbtn motion-modal-close" onClick={onClose} aria-label={t('Close')}>
            <Icon name="xmark" />
          </button>
        </div>

        <div className={'motion-player-stage' + (usingVector ? ' gm-vector-stage' : '')} onClick={() => viewMode === 'loop' && setPlaying(p => !p)}>
          {usingVector ? (
            <ExerciseArtSvg art={art} playing={playing && viewMode === 'loop'} speed={speed} stillFrame={viewMode === 'setup'} />
          ) : (
            <>
              {loading && !failed && (
                <div className="exmedia-skeleton">
                  <div className="exmedia-shimmer" />
                  <Icon name="dumbbell" className="exmedia-skeleton-icon" />
                </div>
              )}

              {failed === 'all' ? (
                <div className="motion-player-failed">
                  <Icon name="dumbbell" className="failed-icon" />
                  <div className="failed-text">{t('Visual guide unavailable')}</div>
                  <Button size="sm" onClick={handleRetry}>{t('Retry')}</Button>
                </div>
              ) : (
                <img
                  key={activeSrc}
                  decoding="async"
                  draggable={false}
                  src={activeSrc}
                  alt={exerciseNameFor(ex)}
                  className={'motion-player-media' + (loading ? ' img-loading' : ' img-loaded')}
                  onLoad={() => setLoading(false)}
                  onError={onError}
                />
              )}
            </>
          )}

          <div className="motion-player-badges">
            <span className="motion-live-pill">
              <span className={'motion-live-dot' + (isAnimating ? ' active' : ' paused')} />
              <span>{isAnimating ? t('Motion HD') : (viewMode === 'setup' ? t('Setup Frame') : t('Paused'))}</span>
            </span>
          </div>

          <div className="motion-player-overlay" onClick={e => e.stopPropagation()}>
            <div className="motion-mode-toggle">
              <button
                type="button"
                className={'motion-mode-btn' + (viewMode === 'loop' ? ' active' : '')}
                onClick={() => { setViewMode('loop'); setPlaying(true) }}
              >
                <Icon name="play" /> {t('Loop')}
              </button>
              <button
                type="button"
                className={'motion-mode-btn' + (viewMode === 'setup' ? ' active' : '')}
                onClick={() => setViewMode('setup')}
              >
                <Icon name="target" /> {t('Setup')}
              </button>
            </div>

            <div className="row" style={{ gap: 6 }}>
              {usingVector && viewMode === 'loop' && (
                <button
                  type="button"
                  className="motion-player-playbtn"
                  onClick={() => setSpeed(s => (s === 1 ? 0.65 : s === 0.65 ? 1.35 : 1))}
                  title={t('Playback speed')}
                >
                  <span>{speed}×</span>
                </button>
              )}
              {viewMode === 'loop' && (
                <button
                  type="button"
                  className="motion-player-playbtn"
                  onClick={() => setPlaying(p => !p)}
                  aria-label={playing ? t('Pause') : t('Play')}
                >
                  <Icon name={playing ? 'pause' : 'play'} />
                  <span>{playing ? t('Pause') : t('Play')}</span>
                </button>
              )}
            </div>
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
