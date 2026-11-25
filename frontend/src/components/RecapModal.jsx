import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'
import BodyMap from './BodyMap.jsx'
import { RollIn } from './GymManeMotion.jsx'
import { buildMonthRecap } from '../lib/gymmane-awards.js'
import { fmtNum } from '../lib/format.js'
import { exerciseNameFor, t } from '../lib/i18n.js'

const SLIDE_BGS = [
  'radial-gradient(circle at 50% 30%, rgba(217,161,132,0.28), #0A0908 72%)',
  'radial-gradient(circle at 30% 25%, rgba(143,163,119,0.28), #0A0908 72%)',
  'radial-gradient(circle at 70% 25%, rgba(224,177,90,0.26), #0A0908 72%)',
  'radial-gradient(circle at 50% 40%, rgba(217,161,132,0.3), #0A0908 74%)',
  'radial-gradient(circle at 50% 30%, rgba(127,168,201,0.28), #0A0908 72%)',
  'radial-gradient(circle at 50% 30%, rgba(167,139,218,0.28), #0A0908 72%)',
  'linear-gradient(160deg, #1E1815 0%, #0A0908 55%, #161B14 100%)',
]

function downloadRecapPng(recap, athleteName, unit) {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1920
  const ctx = c.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, 1080, 1920)
  g.addColorStop(0, '#1C1613')
  g.addColorStop(0.55, '#0B0A09')
  g.addColorStop(1, '#141913')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1080, 1920)

  // Subtle dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let y = 60; y < 1920; y += 44) {
    for (let x = 60; x < 1080; x += 44) {
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.fillStyle = '#D9A184'
  ctx.font = '800 34px Nunito, system-ui, sans-serif'
  ctx.fillText(`SMITRIX · ${recap.monthName.toUpperCase()} ${recap.year}`, 96, 180)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 92px Nunito, system-ui, sans-serif'
  ctx.fillText(athleteName || 'Athlete', 96, 290)

  const cards = [
    { label: 'WORKOUTS', val: String(recap.sessions), col: '#D9A184' },
    { label: 'TOTAL SETS', val: fmtNum(recap.sets), col: '#8FA377' },
    { label: 'TIME TRAINED', val: `${recap.hours} hrs`, col: '#E0B15A' },
    { label: 'VOLUME MOVED', val: `${fmtNum(recap.volume)} ${unit}`, col: '#9CC2E8' },
  ]
  cards.forEach((card, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 96 + col * 460
    const y = 420 + row * 310
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath()
    ctx.roundRect(x, y, 428, 270, 36)
    ctx.fill()
    ctx.fillStyle = card.col
    ctx.font = '800 28px Nunito, system-ui, sans-serif'
    ctx.fillText(card.label, x + 36, y + 78)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 72px Nunito, system-ui, sans-serif'
    ctx.fillText(card.val, x + 36, y + 188)
  })

  if (recap.topMuscle) {
    ctx.fillStyle = 'rgba(217,161,132,0.16)'
    ctx.beginPath()
    ctx.roundRect(96, 1080, 888, 210, 36)
    ctx.fill()
    ctx.fillStyle = '#D9A184'
    ctx.font = '800 28px Nunito, system-ui, sans-serif'
    ctx.fillText('MOST TRAINED MUSCLE', 136, 1152)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 66px Nunito, system-ui, sans-serif'
    ctx.fillText(recap.topMuscle.name, 136, 1240)
  }

  if (recap.bestLift?.weight) {
    const liftName = recap.bestLift.ex ? exerciseNameFor(recap.bestLift.ex) : recap.bestLift.id
    ctx.fillStyle = 'rgba(143,163,119,0.16)'
    ctx.beginPath()
    ctx.roundRect(96, 1330, 888, 210, 36)
    ctx.fill()
    ctx.fillStyle = '#8FA377'
    ctx.font = '800 28px Nunito, system-ui, sans-serif'
    ctx.fillText('HEAVIEST LIFT', 136, 1402)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 54px Nunito, system-ui, sans-serif'
    ctx.fillText(`${recap.bestLift.weight} ${unit} × ${recap.bestLift.reps} · ${liftName}`.slice(0, 32), 136, 1490)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '700 28px Nunito, system-ui, sans-serif'
  ctx.fillText('Tracked with SmiTriX', 96, 1780)

  const url = c.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `smitrix-recap-${recap.year}-${String(recap.monthIndex + 1).padStart(2, '0')}.png`
  a.click()
}

export default function RecapModal({ open, onClose }) {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)

  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const [slide, setSlide] = useState(0)

  const targetDate = useMemo(() => new Date(now.getFullYear(), now.getMonth() + monthOffset, 1), [monthOffset])
  const recap = useMemo(
    () => buildMonthRecap(S, targetDate.getFullYear(), targetDate.getMonth()),
    [S, targetDate]
  )

  if (!open) return null

  const athleteName = user?.name?.trim() || S.athleteProfile?.handle || 'Athlete'
  const avatarUrl = S.athleteProfile?.photoURL || user?.photoURL || ''
  const unit = S.unit || 'kg'
  const totalSlides = 7

  const next = () => setSlide(s => (s < totalSlides - 1 ? s + 1 : 0))
  const prev = () => setSlide(s => (s > 0 ? s - 1 : 0))

  const handleStageTap = e => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.3) prev()
    else next()
  }

  const carEquiv = Math.max(1, Math.round(recap.volume / (unit === 'lb' ? 3300 : 1500)))

  return (
    <div className="gm-recap-overlay" style={{ background: SLIDE_BGS[slide] || SLIDE_BGS[0] }} role="dialog" aria-label={t('Monthly Recap')}>
      {/* Progress bars */}
      <div style={{ display: 'flex', gap: 6, padding: '18px 18px 8px', zIndex: 4 }}>
        {Array.from({ length: totalSlides }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSlide(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: i <= slide ? '#FFFFFF' : 'rgba(255,255,255,0.22)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Top Controls */}
      <div className="row between" style={{ padding: '6px 18px 10px', zIndex: 4 }}>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className="iconbtn"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', width: 32, height: 32 }}
            onClick={() => { setMonthOffset(m => m - 1); setSlide(0) }}
            aria-label={t('Previous month')}
          >
            <Icon name="chevronLeft" style={{ fontSize: 14 }} />
          </button>
          <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: '0.04em' }}>
            {recap.monthName} {recap.year}
          </span>
          <button
            type="button"
            className="iconbtn"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', width: 32, height: 32, opacity: monthOffset >= 0 ? 0.35 : 1 }}
            disabled={monthOffset >= 0}
            onClick={() => { setMonthOffset(m => Math.min(0, m + 1)); setSlide(0) }}
            aria-label={t('Next month')}
          >
            <Icon name="chevronRight" style={{ fontSize: 14 }} />
          </button>
        </div>

        <button
          type="button"
          className="iconbtn"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={onClose}
          aria-label={t('Close')}
        >
          <Icon name="xmark" />
        </button>
      </div>

      {/* Interactive Story Canvas */}
      <div
        onClick={handleStageTap}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 28px 40px',
          textAlign: 'center',
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {slide === 0 && (
          <>
            <div style={{ position: 'absolute', inset: '22% 0 auto', overflow: 'hidden', opacity: 0.9 }}>
              <div className="gm-name-ticker">
                {`${athleteName.toUpperCase()} · ${recap.monthName.toUpperCase()} · `.repeat(8)}
              </div>
            </div>
            <div style={{ position: 'relative', width: 112, height: 112, marginBottom: 28 }}>
              <div className="gm-story-ring" />
              <div className="gm-story-ring" style={{ animationDelay: '0.55s' }} />
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: '50%',
                  background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'linear-gradient(135deg, #D9A184, #8FA377)',
                  border: '3px solid rgba(255,255,255,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 38,
                  fontWeight: 900,
                  color: '#111',
                }}
              >
                {!avatarUrl && athleteName.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="gm-micro" style={{ color: '#D9A184', letterSpacing: '0.24em' }}>{t('MONTHLY RECAP')}</div>
            <h1 style={{ fontSize: 42, fontWeight: 900, margin: '10px 0 8px', letterSpacing: '-0.03em' }}>
              {recap.monthName}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, maxWidth: 300, lineHeight: 1.5 }}>
              {recap.empty
                ? t('No workouts logged in {0} yet. Tap through or switch months above.', recap.monthName)
                : t('Hey {0}, here is everything you built this month.', athleteName)}
            </p>
          </>
        )}

        {slide === 1 && (
          <>
            <div className="gm-micro" style={{ color: '#8FA377', letterSpacing: '0.22em' }}>{t('SHOWING UP')}</div>
            <RollIn value={recap.sessions} style={{ fontSize: 108, fontWeight: 900, lineHeight: 1, marginTop: 14 }} />
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
              {recap.sessions === 1 ? t('Workout logged') : t('Workouts logged')}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '14px 22px' }}>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{fmtNum(recap.sets)}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{t('SETS')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '14px 22px' }}>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{fmtNum(recap.reps)}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{t('REPS')}</div>
              </div>
            </div>
          </>
        )}

        {slide === 2 && (
          <>
            <div className="gm-micro" style={{ color: '#E0B15A', letterSpacing: '0.22em' }}>{t('TIME UNDER THE BAR')}</div>
            <RollIn value={recap.hours} format={v => v.toFixed(1)} style={{ fontSize: 102, fontWeight: 900, lineHeight: 1, marginTop: 14 }} />
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{t('Hours trained')}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginTop: 10 }}>
              {fmtNum(recap.minutes)} {t('focused minutes invested in yourself')}
            </div>
          </>
        )}

        {slide === 3 && (
          <>
            <div className="gm-micro" style={{ color: '#D9A184', letterSpacing: '0.22em' }}>{t('TOTAL IRON MOVED')}</div>
            <RollIn value={recap.volume} format={v => fmtNum(Math.round(v))} style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, marginTop: 14 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: '#D9A184', marginTop: 4 }}>{unit}</div>
            {recap.volume > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: '12px 20px', marginTop: 24, fontSize: 14, fontWeight: 700 }}>
                {t('Roughly the weight of {0} sedans', carEquiv)}
              </div>
            )}
          </>
        )}

        {slide === 4 && (
          <>
            <div className="gm-micro" style={{ color: '#9CC2E8', letterSpacing: '0.22em' }}>{t('TOP MUSCLE GROUP')}</div>
            <div style={{ fontSize: 38, fontWeight: 900, marginTop: 10, marginBottom: 14 }}>
              {recap.topMuscle ? recap.topMuscle.name : t('Balanced Training')}
            </div>
            <div style={{ width: '100%', maxWidth: 280 }}>
              <BodyMap load={recap.muscleCount} body={S.body} />
            </div>
          </>
        )}

        {slide === 5 && (
          <>
            <div className="gm-micro" style={{ color: '#C4A7F2', letterSpacing: '0.22em' }}>{t('SIGNATURE LIFT & RHYTHM')}</div>
            {recap.bestLift?.weight ? (
              <>
                <div style={{ fontSize: 58, fontWeight: 900, marginTop: 16 }}>
                  {fmtNum(recap.bestLift.weight)} {unit}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#D9A184', textTransform: 'capitalize', marginTop: 4 }}>
                  {recap.bestLift.ex ? exerciseNameFor(recap.bestLift.ex) : recap.bestLift.id} × {recap.bestLift.reps}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 18 }}>{t('Consistency builds strength')}</div>
            )}
            {recap.favDay && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '14px 24px', marginTop: 28 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>
                  {t('FAVORITE TRAINING DAY')}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{recap.favDay}</div>
              </div>
            )}
          </>
        )}

        {slide === 6 && (
          <div style={{ width: '100%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 28,
                padding: 22,
                textAlign: 'left',
              }}
            >
              <div className="gm-micro" style={{ color: '#D9A184' }}>SMITRIX · {recap.monthName.toUpperCase()} {recap.year}</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, marginBottom: 16 }}>{athleteName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>{t('SESSIONS')}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>{recap.sessions}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>{t('SETS')}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>{fmtNum(recap.sets)}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>{t('HOURS')}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>{recap.hours}h</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>{t('VOLUME')}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, marginTop: 5 }}>{fmtNum(recap.volume)} {unit}</div>
                </div>
              </div>
              {recap.topMuscle && (
                <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#D9A184' }}>
                  {t('Top focus')}: {recap.topMuscle.name}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn primary"
                style={{ flex: 1 }}
                onClick={() => {
                  downloadRecapPng(recap, athleteName, unit)
                  toast(t('Recap image saved'))
                }}
              >
                <Icon name="download" style={{ fontSize: 15 }} /> {t('Save PNG')}
              </button>
              <button type="button" className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.12)', color: '#fff' }} onClick={onClose}>
                {t('Done')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 22, fontSize: 11.5, color: 'rgba(255,255,255,0.42)', fontWeight: 700 }}>
        {slide < totalSlides - 1 ? t('Tap right for next · left for back') : `${slide + 1} / ${totalSlides}`}
      </div>
    </div>
  )
}
