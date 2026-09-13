import { useState } from 'react'
import { imgSrc, gifSrc } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import MotionModal from './MotionModal.jsx'

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// Custom exercises have no media — the animation stays blank by design (issue #11).
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12). Settings can also turn workout media off entirely
// (gifSize 'off') — then nothing renders here and the exercise card closes up, exactly like
// a custom exercise without media. Any other/legacy value behaves as 'full'.
export default function Media({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const [failed, setFailed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  if (!ex.gif) return null
  if (minimizable && gifSize === 'off') return null
  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }
  const showGif = playing && failed == null
  const onError = () => { setLoading(false); setFailed(showGif ? 'gif' : 'all') }
  const onTap = () => {
    if (failed) { setFailed(null); setPlaying(true); return }
    setPlaying(p => !p)
  }
  return (
    <>
      <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '') + (failed === 'all' ? ' broken' : '')} id={id} onClick={onTap}>
        {loading && !failed && (
          <div className="exmedia-skeleton">
            <div className="exmedia-shimmer" />
            <Icon name="dumbbell" className="exmedia-skeleton-icon" />
          </div>
        )}
        {failed === 'all'
          ? <div className="exmedia-x"><Icon name="dumbbell" /></div>
          : <img
              decoding="async"
              draggable={false}
              className={loading ? 'img-loading' : 'img-loaded'}
              src={showGif ? gifSrc(ex) : imgSrc(ex)}
              alt={exerciseNameFor(ex)}
              onLoad={() => setLoading(false)}
              onError={onError}
            />}
        {minimizable && (
          <button className="giftoggle" onClick={toggleSize}>
            <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
          </button>
        )}
        {!mini && !failed && (
          <button
            type="button"
            className="motion-guide-badge"
            title={t('HD Motion & Form Guide')}
            onClick={e => { e.stopPropagation(); setShowGuide(true) }}
          >
            <Icon name="play" /><span>{t('HD Guide')}</span>
          </button>
        )}
        {!mini && !failed && (
          <span className="gifhint">
            <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
          </span>
        )}
      </div>
      {showGuide && <MotionModal ex={ex} onClose={() => setShowGuide(false)} />}
    </>
  )
}

export function Thumb({ ex }) {
  if (!ex.img) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return <img className="thumb" loading="lazy" decoding="async" draggable={false} src={imgSrc(ex)} alt="" />
}
