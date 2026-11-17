import { useState, useMemo } from 'react'
import { evaluateAchievements, ACHIEVEMENT_TIERS } from '../lib/achievements.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function AchievementsModal({ S, close }) {
  const [activeCategory, setActiveCategory] = useState('all')

  const { items, unlockedCount, totalCount, totalPoints, maxPoints, unlockedPct } = useMemo(() => {
    return evaluateAchievements(S)
  }, [S])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter(a => a.category === activeCategory)
  }, [items, activeCategory])

  const categories = [
    { id: 'all', label: t('All Trophies') },
    { id: 'strength', label: t('Strength') },
    { id: 'consistency', label: t('Consistency') },
    { id: 'volume', label: t('Volume') },
    { id: 'legend', label: t('Legend Protocols') },
  ]

  return (
    <div className="achievements-modal-content" style={{ padding: '4px 0' }}>
      {/* Header */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="trophy" style={{ color: 'var(--yellow)' }} />
            {t('Athletic Hall of Fame')}
          </h3>
          <div className="small dim" style={{ marginTop: 2 }}>
            {t('{0} of {1} achievements earned ({2} pts)', unlockedCount, totalCount, totalPoints)}
          </div>
        </div>
        <button className="iconbtn" onClick={close} aria-label="Close"><Icon name="xmark" /></button>
      </div>

      {/* Level Progress Banner */}
      <div
        className="achievements-score-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(48, 209, 88, 0.08))',
          borderRadius: 16,
          padding: '14px 16px',
          border: '1px solid rgba(255, 215, 0, 0.25)',
          marginBottom: 16
        }}
      >
        <div className="row between" style={{ marginBottom: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ffd700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('Mastery Level: {0}%', unlockedPct)}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>
            {totalPoints} <span style={{ fontSize: 11, color: 'var(--label-3)' }}>/ {maxPoints} PTS</span>
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${unlockedPct}%`,
              background: 'linear-gradient(90deg, #ffd700, #30d158)',
              borderRadius: 4,
              transition: 'width 400ms ease'
            }}
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        className="achieve-filters"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 12,
          scrollbarWidth: 'none'
        }}
      >
        {categories.map(c => (
          <button
            key={c.id}
            type="button"
            className={'tag' + (activeCategory === c.id ? ' acc' : '')}
            onClick={() => setActiveCategory(c.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 16,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeCategory === c.id ? 'var(--acc)' : 'var(--surface-2)',
              color: activeCategory === c.id ? 'var(--on-acc)' : 'var(--label-2)',
              border: activeCategory === c.id ? 'none' : '1px solid var(--sep-op)'
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Achievements List */}
      <div className="achieve-card-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
        {filteredItems.map(ach => {
          const isUnlocked = ach.unlocked
          const tier = ach.tierMeta

          return (
            <div
              key={ach.id}
              className={'achieve-item' + (isUnlocked ? ' unlocked' : ' locked')}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: isUnlocked ? 'var(--surface-2)' : 'rgba(28, 28, 30, 0.4)',
                border: isUnlocked ? `1.5px solid ${tier.border}` : '1px solid var(--sep-op)',
                opacity: isUnlocked ? 1 : 0.75,
                alignItems: 'center',
                position: 'relative'
              }}
            >
              {/* Badge Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isUnlocked ? tier.bg : 'var(--surface-3)',
                  border: `1.5px solid ${isUnlocked ? tier.color : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isUnlocked ? tier.color : 'var(--label-4)',
                  fontSize: 22,
                  flexShrink: 0
                }}
              >
                <Icon name={ach.icon || 'trophy'} />
              </div>

              {/* Text Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ alignItems: 'baseline', marginBottom: 2 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: isUnlocked ? '#ffffff' : 'var(--label-2)' }}>
                    {ach.title}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: tier.color,
                      letterSpacing: 0.5
                    }}
                  >
                    {tier.name} · +{ach.points}
                  </span>
                </div>

                <div className="small dim" style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 6 }}>
                  {ach.desc}
                </div>

                {/* Progress bar or Unlocked stamp */}
                {isUnlocked ? (
                  <div className="row" style={{ gap: 5, alignItems: 'center' }}>
                    <Icon name="checkCircle" style={{ color: 'var(--green)', fontSize: 13 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {t('Achievement Unlocked')}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="row between" style={{ fontSize: 10, color: 'var(--label-3)', marginBottom: 3 }}>
                      <span>{t('Progress')}</span>
                      <span>{ach.progressText || `${ach.pct}%`}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${ach.pct}%`,
                          background: tier.color,
                          borderRadius: 2
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: 14 }} />
      <Button variant="primary" onClick={close}>{t('Close')}</Button>
    </div>
  )
}
