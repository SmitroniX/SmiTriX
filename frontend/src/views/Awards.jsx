import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { CollapsedHeader, MedalSpin, Rise, RollIn } from '../components/GymManeMotion.jsx'
import { evaluateGymManeAwards } from '../lib/gymmane-awards.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'

export default function Awards() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const openSheet = useUI(s => s.openSheet)

  const stats = useMemo(() => evaluateGymManeAwards(S), [S])
  const handle = S.athleteProfile?.handle || user?.name?.toLowerCase().replace(/\s+/g, '') || 'athlete'

  const inspectMedal = award => {
    openSheet(
      close => (
        <div style={{ textAlign: 'center', padding: '12px 4px 6px' }}>
          <div className="gm-micro" style={{ color: award.earned ? 'var(--acc)' : 'var(--label-3)', marginBottom: 14 }}>
            {award.earned ? t('EARNED MEDAL') : t('LOCKED MEDAL')}
          </div>
          <MedalSpin
            id={award.id}
            name={award.name}
            date={award.wonAt || (award.earned ? t('Unlocked') : t('Locked'))}
            handle={handle}
            size={186}
            locked={!award.earned}
            spinIn={award.earned}
          />
          <h3 style={{ marginTop: 18, marginBottom: 6, fontSize: 22 }}>{t(award.name)}</h3>
          <div className="muted small" style={{ maxWidth: 280, margin: '0 auto 14px', lineHeight: 1.45 }}>
            {t(award.desc)}
          </div>
          <div className="dim small" style={{ marginBottom: 16 }}>
            {t('Drag or tap the medal to inspect both sides')}
          </div>
          <button type="button" className="btn primary" onClick={close}>{t('Close')}</button>
        </div>
      ),
      { kind: 'center' }
    )
  }

  return (
    <div className="narrow" style={{ paddingBottom: 44 }}>
      <CollapsedHeader title={t('Medals')} />

      <div className="hdr" style={{ gap: 10 }}>
        <button type="button" className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1 }}>
          <h1>{t('Medals')}</h1>
          <div className="sub">{t('{0} of {1} unlocked', stats.earnedCount, stats.total)}</div>
        </div>
      </div>

      {/* Level & XP Progress Hero */}
      <Rise index={0} className="card" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div className="gm-micro" style={{ color: 'var(--acc)' }}>{t('ATHLETE LEVEL')}</div>
            <div style={{ fontSize: 34, fontWeight: 900, marginTop: 2 }}>
              {t('Level')} <RollIn value={stats.level} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gm-sage)' }}>{fmtNum(stats.xp)} XP</div>
            <div className="dim small">{Math.round(stats.levelProgress * 100)}% {t('to next')}</div>
          </div>
        </div>

        <div style={{ height: 10, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ width: `${Math.round(stats.levelProgress * 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--acc), var(--gm-sage))', borderRadius: 99, transition: 'width 500ms ease' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 6px' }}>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{stats.metrics.sessions}</div>
            <div className="gm-micro" style={{ fontSize: 9 }}>{t('SESSIONS')}</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 6px' }}>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{fmtNum(stats.metrics.sets)}</div>
            <div className="gm-micro" style={{ fontSize: 9 }}>{t('SETS')}</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 6px' }}>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{Math.round(stats.metrics.hours)}h</div>
            <div className="gm-micro" style={{ fontSize: 9 }}>{t('HOURS')}</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 6px' }}>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{stats.metrics.bestStreak}d</div>
            <div className="gm-micro" style={{ fontSize: 9 }}>{t('STREAK')}</div>
          </div>
        </div>
      </Rise>

      {/* 20 Medals Showcase Grid */}
      <Rise index={1}>
        <div className="gm-micro" style={{ marginBottom: 12 }}>{t('ALL 20 MEDALS · TAP ANY TO SPIN IN 3D')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(106px, 1fr))', gap: 10 }}>
          {stats.awards.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => inspectMedal(a)}
              className="card"
              style={{
                margin: 0,
                padding: '14px 8px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                border: a.earned ? '1px solid color-mix(in srgb, var(--acc) 45%, transparent)' : '1px solid var(--sep-op)',
                opacity: a.earned ? 1 : 0.72,
              }}
            >
              <img
                src={a.earned ? `./smitrix-ui/badges/${a.id}.webp` : `./smitrix-ui/badges/${a.id}_off.webp`}
                alt={a.name}
                loading="lazy"
                style={{
                  width: 68,
                  height: 68,
                  objectFit: 'contain',
                  margin: '0 auto 8px',
                  display: 'block',
                  filter: a.earned ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.4))' : 'grayscale(0.6)',
                }}
              />
              <div style={{ fontSize: 12, fontWeight: 800, color: a.earned ? 'var(--label)' : 'var(--label-2)', lineHeight: 1.25 }}>
                {t(a.name)}
              </div>
            </button>
          ))}
        </div>
      </Rise>
    </div>
  )
}
