import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { PLANS, getFreePlan, getLegacyPlan } from '../lib/subscription-plans.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function PlansManager() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const activePlanId = S.tier || 'legacy' // default to legacy/unlocked for self-hosted owners
  const [activeTab, setActiveTab] = useState('all') // 'all', 'free', 'legacy'

  const freePlan = getFreePlan()
  const legacyPlan = getLegacyPlan()

  const handleSelectTier = tierId => {
    update(s => { s.tier = tierId })
    useUI.getState().toast(t('Active tier set to {0}', tierId === 'legacy' ? 'Legacy Plan' : 'Free Plan'))
  }

  const renderPlanCard = (plan, isCurrent) => {
    const isLegacy = plan.isLegacy
    const accentColor = isLegacy ? 'var(--amber, #f59e0b)' : 'var(--blue, #3b82f6)'
    const bgGradient = isLegacy
      ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(20, 20, 24, 0.95) 100%)'
      : 'linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(20, 20, 24, 0.95) 100%)'

    return (
      <div
        key={plan.id}
        className="card"
        style={{
          padding: '24px 20px',
          background: bgGradient,
          border: isCurrent ? `1.5px solid ${accentColor}` : '1px solid var(--border-hairline)',
          borderRadius: 18,
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              padding: '4px 10px',
              borderRadius: 20,
              background: isLegacy ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: accentColor,
              border: `1px solid ${accentColor}`
            }}
          >
            {isLegacy ? `🏛️ ${t('Legacy Vault')}` : `⚡ ${t('Active Core')}`}
          </span>

          {isCurrent ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--acc)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(34, 197, 94, 0.15)',
                padding: '4px 10px',
                borderRadius: 20
              }}
            >
              <Icon name="check" size={13} /> {t('Active Plan')}
            </span>
          ) : (
            <button
              onClick={() => handleSelectTier(plan.id)}
              className="btn small"
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              {t('Activate')}
            </button>
          )}
        </div>

        {/* Title & Pricing */}
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 2px' }}>{plan.name}</h2>
        <div className="muted small" style={{ marginBottom: 16 }}>{plan.subtitle}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--label-1)' }}>{plan.price}</span>
          <span className="dim small">/ {plan.billingPeriod}</span>
        </div>

        <p style={{ fontSize: 14, color: 'var(--label-2)', lineHeight: 1.5, marginBottom: 20 }}>
          {plan.description}
        </p>

        {/* Key Highlights */}
        <div
          style={{
            background: 'var(--surface-3)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 20
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--label-3)', marginBottom: 8 }}>
            {t('Key Highlights')}
          </div>
          {plan.highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6, color: 'var(--label-1)' }}>
              <Icon name="sparkles" size={13} style={{ color: accentColor }} />
              <span>{h}</span>
            </div>
          ))}
        </div>

        {/* Features Matrix */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--label-3)', marginBottom: 10 }}>
            {t('Features & Entitlements')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.features.map(f => (
              <div
                key={f.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: f.highlight ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border-hairline)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: f.included ? (f.highlight ? 'var(--amber)' : 'var(--acc)') : 'var(--label-3)' }}>
                    <Icon name={f.included ? 'check' : 'x'} size={14} />
                  </span>
                  <span style={{ fontSize: 13, color: f.included ? 'var(--label-1)' : 'var(--label-3)' }}>
                    {f.label}
                  </span>
                  {f.isLegacy && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--amber)',
                        fontWeight: 700
                      }}
                    >
                      LEGACY
                    </span>
                  )}
                </div>
                {f.limit && (
                  <span className="dim small" style={{ fontSize: 11 }}>{f.limit}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="check" size={13} /> {t('Benefits')}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--label-2)', lineHeight: 1.6 }}>
            {plan.benefits.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>

        {/* Limitations Section */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--label-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={13} /> {t('Limitations')}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--label-3)', lineHeight: 1.5 }}>
            {plan.limitations.map((lim, i) => <li key={i}>{lim}</li>)}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="dim small uppercase tracking" style={{ letterSpacing: '.14em', fontWeight: 700 }}>
            {t('Tier Management')}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '2px 0 0' }}>{t('Plans & Features')}</h1>
        </div>
        <Button variant="ghost" onClick={() => nav(-1)} style={{ padding: '8px 12px' }}>
          <Icon name="x" size={18} />
        </Button>
      </div>

      <p className="muted small" style={{ marginBottom: 20 }}>
        {t('SmiTriX offers modular feature tiers. Compare the Community Free Plan and the Golden Era Legacy Vault below.')}
      </p>

      {/* Segmented Filter */}
      <div
        className="row"
        style={{
          background: 'var(--surface-2)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
          gap: 4
        }}
      >
        <button
          className={`btn ${activeTab === 'all' ? 'primary' : 'ghost'}`}
          style={{ flex: 1, padding: '7px 0', fontSize: 13 }}
          onClick={() => setActiveTab('all')}
        >
          {t('All Plans')}
        </button>
        <button
          className={`btn ${activeTab === 'free' ? 'primary' : 'ghost'}`}
          style={{ flex: 1, padding: '7px 0', fontSize: 13 }}
          onClick={() => setActiveTab('free')}
        >
          {t('Free Plan')}
        </button>
        <button
          className={`btn ${activeTab === 'legacy' ? 'primary' : 'ghost'}`}
          style={{ flex: 1, padding: '7px 0', fontSize: 13 }}
          onClick={() => setActiveTab('legacy')}
        >
          🏛️ {t('Legacy Plan')}
        </button>
      </div>

      {/* Plan Cards */}
      {(activeTab === 'all' || activeTab === 'free') && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={15} /> {t('Community Free Section')}
          </div>
          {renderPlanCard(freePlan, activePlanId === 'free')}
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'legacy') && (
        <div style={{ marginTop: activeTab === 'all' ? 12 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="dna" size={15} /> {t('Golden Era Legacy Section')}
          </div>
          {renderPlanCard(legacyPlan, activePlanId === 'legacy')}
        </div>
      )}

      {/* Feature Architecture Note */}
      <div
        className="card"
        style={{
          padding: 16,
          background: 'var(--surface-2)',
          border: '1px dashed var(--border-hairline)',
          borderRadius: 14,
          marginTop: 16,
          marginBottom: 32
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
          🛡️ {t('Self-Hosted Independence')}
        </div>
        <div className="muted small" style={{ lineHeight: 1.5 }}>
          {t('SmiTriX is designed with zero forced subscriptions or artificial paywalls. All modules are configurable and scalable under your own control.')}
        </div>
      </div>
    </div>
  )
}
