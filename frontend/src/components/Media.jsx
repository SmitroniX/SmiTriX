import { useEffect, useMemo, useRef, useState } from 'react'
import { imgSrc, gifSrc, mediaUrlsFor } from '../lib/exercises.js'
import { resolveExerciseArtSlug, getCachedExerciseArt, loadExerciseArt } from '../lib/exercise-art.js'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import MotionModal from './MotionModal.jsx'

const CYCLE_MS = 1560

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

// Crisp GymMane-exact vector line-art animation engine:
// 1560ms ping-pong across multi-frame SVG paths, 72% hold / 28% cubic ease-in-out crossfade.
export function ExerciseArtSvg({ art, playing = true, speed = 1, stillFrame = false, className = '' }) {
  const pathRefs = useRef([])
  const rafRef = useRef(0)
  const clockRef = useRef({ elapsed: 0, lastTs: 0 })

  useEffect(() => {
    const frames = art?.frames || []
    const n = frames.length
    const applyPose = (fromIdx, toIdx, blend) => {
      for (let i = 0; i < n; i++) {
        const node = pathRefs.current[i]
        if (!node) continue
        let op = 0
        if (i === fromIdx) op = 1 - blend
        else if (i === toIdx) op = blend
        node.style.opacity = op <= 0.01 ? '0' : op.toFixed(3)
      }
    }

    if (n <= 1 || stillFrame) {
      applyPose(0, -1, 0)
      return undefined
    }

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!playing || reduced) {
      applyPose(0, -1, 0)
      return undefined
    }

    const steps = (n - 1) * 2
    clockRef.current.lastTs = performance.now()

    const tick = now => {
      const dt = Math.min(80, Math.max(0, now - clockRef.current.lastTs))
      clockRef.current.lastTs = now
      clockRef.current.elapsed = (clockRef.current.elapsed + dt * speed) % CYCLE_MS
      const tNorm = clockRef.current.elapsed / CYCLE_MS
      const pos = tNorm * steps
      const step = Math.floor(pos) % steps
      const f = pos - Math.floor(pos)
      const ascending = step < n - 1
      const from = ascending ? step : steps - step
      const to = ascending ? from + 1 : from - 1
      const blend = f < 0.72 ? 0 : easeInOutCubic(Math.min(1, Math.max(0, (f - 0.72) / 0.28)))
      applyPose(from, to, blend)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [art, playing, speed, stillFrame])

  if (!art?.frames?.length) return null

  return (
    <svg
      className={'gm-art-svg ' + className}
      viewBox={art.viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {art.frames.map((d, i) => (
        <path
          key={i}
          ref={el => { pathRefs.current[i] = el }}
          d={d}
          fill="currentColor"
          fillRule="evenodd"
          style={{ opacity: i === 0 ? 1 : 0 }}
        />
      ))}
    </svg>
  )
}

// High-fidelity autoplaying GymMane vector animation with resilient multi-CDN image fallback & HD Guide.
// Custom exercises have no media — the animation stays blank by design (issue #11).
// `minimizable` (workout view) adds a persistent minimize/expand control; settings can also turn
// workout media off entirely (gifSize 'off') — then nothing renders here.
export default function Media({ ex, id, compact, minimizable }) {
  const slug = useMemo(() => (ex?.gif ? resolveExerciseArtSlug(ex) : null), [ex?.id, ex?.n, ex?.eq, ex?.bp, ex?.tg, ex?.gif])
  const [art, setArt] = useState(() => (slug ? getCachedExerciseArt(slug) : null))
  const [playing, setPlaying] = useState(true)
  const [cdnIndex, setCdnIndex] = useState(0)
  const [failed, setFailed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)

  useEffect(() => {
    setPlaying(true)
    setCdnIndex(0)
    setFailed(null)
    setLoading(true)
    if (!slug) {
      setArt(null)
      return
    }
    const cached = getCachedExerciseArt(slug)
    if (cached) {
      setArt(cached)
      setLoading(false)
      return
    }
    setArt(null)
    let cancelled = false
    loadExerciseArt(slug).then(data => {
      if (!cancelled && data) {
        setArt(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [ex?.id, slug])

  if (!ex?.gif) return null
  if (minimizable && gifSize === 'off') return null
  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }

  const gifUrls = mediaUrlsFor(ex, 'gif')
  const imgUrls = mediaUrlsFor(ex, 'img')

  const currentGifUrl = gifUrls[cdnIndex] || gifUrls[0] || gifSrc(ex)
  const currentImgUrl = imgUrls[cdnIndex] || imgUrls[0] || imgSrc(ex)

  const showGif = playing && failed == null
  const activeSrc = showGif ? currentGifUrl : currentImgUrl

  const onError = () => {
    if (showGif && cdnIndex < gifUrls.length - 1) {
      setCdnIndex(i => i + 1)
      return
    }
    if (showGif) {
      setCdnIndex(0)
      setFailed('gif')
      return
    }
    if (cdnIndex < imgUrls.length - 1) {
      setCdnIndex(i => i + 1)
      return
    }
    setLoading(false)
    setFailed('all')
  }

  const onTap = () => {
    if (!art && failed) { setFailed(null); setCdnIndex(0); setPlaying(true); return }
    setPlaying(p => !p)
  }

  const usingVector = !!art

  return (
    <>
      <div
        className={'exmedia gm-exmedia' + (usingVector ? ' gm-vector' : '') + (compact ? ' compact' : '') + (mini ? ' mini' : '') + (!usingVector && failed === 'all' ? ' broken' : '')}
        id={id}
        onClick={onTap}
      >
        {usingVector ? (
          <ExerciseArtSvg art={art} playing={playing} stillFrame={mini} />
        ) : (
          <>
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
                  src={activeSrc}
                  alt={exerciseNameFor(ex)}
                  onLoad={() => setLoading(false)}
                  onError={onError}
                />}
          </>
        )}

        {minimizable && (
          <button type="button" className="giftoggle" onClick={toggleSize}>
            <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
          </button>
        )}

        {!mini && (usingVector || !failed) && (
          <span className="motion-live-pill" title={playing ? t('Motion Active') : t('Motion Paused')}>
            <span className={'motion-live-dot' + (playing ? ' active' : ' paused')} />
            <span>{playing ? t('Motion HD') : t('Paused')}</span>
          </span>
        )}

        {!mini && (usingVector || !failed) && (
          <button
            type="button"
            className="motion-guide-badge"
            title={t('HD Motion & Form Guide')}
            onClick={e => { e.stopPropagation(); setShowGuide(true) }}
          >
            <Icon name="play" /><span>{t('HD Guide')}</span>
          </button>
        )}

        {!mini && (usingVector || !failed) && (
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
  const slug = useMemo(() => (ex?.img || ex?.gif ? resolveExerciseArtSlug(ex) : null), [ex?.id, ex?.n, ex?.eq, ex?.bp, ex?.tg, ex?.img, ex?.gif])
  const [art, setArt] = useState(() => (slug ? getCachedExerciseArt(slug, true) : null))
  const [srcIdx, setSrcIdx] = useState(0)
  const hostRef = useRef(null)

  useEffect(() => {
    setSrcIdx(0)
    if (!slug) { setArt(null); return }
    const cached = getCachedExerciseArt(slug, true)
    if (cached) { setArt(cached); return }
    setArt(null)

    let cancelled = false
    const fetchNow = () => {
      loadExerciseArt(slug, { still: true }).then(data => {
        if (!cancelled && data) setArt(data)
      })
    }

    if (typeof IntersectionObserver !== 'undefined' && hostRef.current) {
      const obs = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          obs.disconnect()
          fetchNow()
        }
      }, { rootMargin: '180px' })
      obs.observe(hostRef.current)
      return () => { cancelled = true; obs.disconnect() }
    }
    fetchNow()
    return () => { cancelled = true }
  }, [slug])

  if (!ex?.img && !ex?.gif) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>

  if (art) {
    return (
      <div className="thumb gm-thumb-art" ref={hostRef} aria-hidden="true">
        <ExerciseArtSvg art={art} playing={false} stillFrame={true} />
      </div>
    )
  }

  const urls = mediaUrlsFor(ex, 'img')
  if (srcIdx >= urls.length) return <div className="thumb thumb-x" ref={hostRef}><Icon name="dumbbell" /></div>
  return (
    <div className="thumb gm-thumb-wrap" ref={hostRef}>
      <img
        className="thumb"
        loading="lazy"
        decoding="async"
        draggable={false}
        src={urls[srcIdx]}
        alt=""
        onError={() => setSrcIdx(i => i + 1)}
      />
    </div>
  )
}
