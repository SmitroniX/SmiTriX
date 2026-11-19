import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { getFreePlan, getProPlan, getLegacyPlan, getPlanById } from '../lib/subscription-plans.js'
import { PAYMENT_METHODS, formatPlanAmount, processPaymentCheckout } from '../lib/payment-gateway.js'
import { fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function PlansManager() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const update = useStore(s => s.update)
  const activePlanId = S.tier || 'legacy'
  const [activeTab, setActiveTab] = useState('all') // 'all', 'free', 'pro', 'legacy'
  const [currency, setCurrency] = useState('INR') // 'INR' | 'USD'
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [payMethod, setPayMethod] = useState('upi')
  const [upiId, setUpiId] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState(user?.name || '')
  const [couponCode, setCouponCode] = useState('')
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState('')

  const freePlan = getFreePlan()
  const proPlan = getProPlan()
  const legacyPlan = getLegacyPlan()
  const billingHistory = S.billingHistory || []

  const handleSelectTier = tierId => {
    const targetPlan = getPlanById(tierId)
    if (targetPlan?.isPaid && tierId !== activePlanId) {
      setPayError('')
      setCheckoutPlan(targetPlan)
      return
    }
    update(s => { s.tier = tierId })
    useUI.getState().toast(t('Active tier set to {0}', targetPlan?.name || tierId))
  }

  const handleCompletePayment = async e => {
    e?.preventDefault?.()
    if (!checkoutPlan) return
    setPayError('')
    setPayBusy(true)
    try {
      const receipt = await processPaymentCheckout({
        planId: checkoutPlan.id,
        method: payMethod,
        currency,
        billingCycle,
        upiId,
        cardNumber,
        cardExpiry,
        cardCvc,
        cardName,
        couponCode,
        user
      })
      update(s => {
        s.tier = checkoutPlan.id
        s.billingHistory = [receipt, ...(s.billingHistory || [])].slice(0, 20)
      })
      setCheckoutPlan(null)
      useUI.getState().toast(t('Payment verified! {0} unlocked.', checkoutPlan.name))
    } catch (err) {
      setPayError(err.message || t('Payment failed. Please check your details.'))
    } finally {
      setPayBusy(false)
    }
  }

  const renderPlanCard = (plan, isCurrent) => {
    if (!plan) return null
    const isLegacy = plan.isLegacy
    const isPro = plan.id === 'pro'
    const accentColor = isLegacy
      ? 'var(--amber, #f59e0b)'
      : isPro
      ? 'var(--acc, #30d158)'
      : 'var(--blue, #3b82f6)'
    const bgGradient = isLegacy
      ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, var(--surface) 100%)'
      : isPro
      ? 'linear-gradient(180deg, rgba(48, 209, 88, 0.08) 0%, var(--surface) 100%)'
      : 'linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, var(--surface) 100%)'

    const displayPrice = formatPlanAmount(plan, currency, billingCycle)
    const displayPeriod = !plan.isPaid
      ? plan.billingPeriod
      : isLegacy
      ? t('One-Time Lifetime Access')
      : billingCycle === 'yearly'
      ? t('per year (2 months free)')
      : t('per month')

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
              background: isLegacy ? 'rgba(245, 158, 11, 0.2)' : isPro ? 'rgba(48, 209, 88, 0.18)' : 'rgba(59, 130, 246, 0.2)',
              color: accentColor,
              border: `1px solid ${accentColor}`
            }}
          >
            {isLegacy ? `🏛️ ${t('Legacy Vault')}` : isPro ? `🔥 ${t('Most Popular')}` : `⚡ ${t('Active Core')}`}
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
              className="btn primary"
              style={{ width: 'auto', padding: '6px 14px', fontSize: 12, borderRadius: 10 }}
            >
              {plan.isPaid ? t('Upgrade Now') : t('Activate')}
            </button>
          )}
        </div>

        {/* Title & Pricing */}
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 2px', color: 'var(--label)' }}>{plan.name}</h2>
        <div className="muted small" style={{ marginBottom: 16 }}>{plan.subtitle}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--label-1)' }}>{displayPrice}</span>
          <span className="dim small">/ {displayPeriod}</span>
        </div>

        <p style={{ fontSize: 14, color: 'var(--label-2)', lineHeight: 1.5, marginBottom: 20 }}>
          {plan.description}
        </p>

        {/* Key Highlights */}
        <div
          style={{
            background: 'var(--surface-2)',
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

        {!isCurrent && plan.isPaid && (
          <div style={{ marginTop: 18 }}>
            <Button variant="primary" icon="bolt" onClick={() => handleSelectTier(plan.id)}>
              {t('Checkout {0} ({1})', plan.name, displayPrice)}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="narrow">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="dim small uppercase tracking" style={{ letterSpacing: '.14em', fontWeight: 700 }}>
            {t('Tier Management')}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '2px 0 0' }}>{t('Plans & Features')}</h1>
        </div>
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
          <Icon name="xmark" size={18} />
        </button>
      </div>

      <p className="muted small" style={{ marginBottom: 14 }}>
        {t('SmiTriX offers modular feature tiers. Compare the Community Free Plan, Pro Athlete Plan, and Golden Era Legacy Vault below.')}
      </p>

      {/* Currency & Billing Cycle Controls */}
      <div className="row between" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 6, background: 'var(--surface-2)', padding: 3, borderRadius: 10 }}>
          <button
            type="button"
            className={`btn ${currency === 'INR' ? 'primary' : 'ghost'}`}
            style={{ width: 'auto', padding: '5px 12px', fontSize: 12, borderRadius: 8 }}
            onClick={() => setCurrency('INR')}
          >
            ₹ INR (UPI / Card)
          </button>
          <button
            type="button"
            className={`btn ${currency === 'USD' ? 'primary' : 'ghost'}`}
            style={{ width: 'auto', padding: '5px 12px', fontSize: 12, borderRadius: 8 }}
            onClick={() => setCurrency('USD')}
          >
            $ USD
          </button>
        </div>

        <div className="row" style={{ gap: 6, background: 'var(--surface-2)', padding: 3, borderRadius: 10 }}>
          <button
            type="button"
            className={`btn ${billingCycle === 'monthly' ? 'primary' : 'ghost'}`}
            style={{ width: 'auto', padding: '5px 10px', fontSize: 12, borderRadius: 8 }}
            onClick={() => setBillingCycle('monthly')}
          >
            {t('Monthly')}
          </button>
          <button
            type="button"
            className={`btn ${billingCycle === 'yearly' ? 'primary' : 'ghost'}`}
            style={{ width: 'auto', padding: '5px 10px', fontSize: 12, borderRadius: 8 }}
            onClick={() => setBillingCycle('yearly')}
          >
            {t('Yearly (-17%)')}
          </button>
        </div>
      </div>

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
          style={{ flex: 1, padding: '7px 0', fontSize: 12 }}
          onClick={() => setActiveTab('all')}
        >
          {t('All Plans')}
        </button>
        <button
          className={`btn ${activeTab === 'free' ? 'primary' : 'ghost'}`}
          style={{ flex: 1, padding: '7px 0', fontSize: 12 }}
          onClick={() => setActiveTab('free')}
        >
          {t('Free Plan')}
        </button>
        <button
          className={`btn ${activeTab === 'pro' ? 'primary' : 'ghost'}`}
          style={{ flex: 1, padding: '7px 0', fontSize: 12 }}
          onClick={() => setActiveTab('pro')}
        >
          🔥 {t('Pro Plan')}
        </button>
        <button
          className={`btn ${activeTab === 'legacy' ? 'primary' : 'ghost'}`}
          style={{ flex: 1, padding: '7px 0', fontSize: 12 }}
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

      {(activeTab === 'all' || activeTab === 'pro') && proPlan && (
        <div style={{ marginTop: activeTab === 'all' ? 12 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="bolt" size={15} /> {t('Pro Athlete Subscription Section')}
          </div>
          {renderPlanCard(proPlan, activePlanId === 'pro')}
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

      {/* Billing & Receipt History */}
      {billingHistory.length > 0 && (
        <div className="card" style={{ marginTop: 12, marginBottom: 16 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15 }}>{t('Verified Payment Receipts')}</h2>
            <span className="tag acc" style={{ fontSize: 11 }}>{billingHistory.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {billingHistory.map(item => (
              <div key={item.transactionId} className="row between" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--label)' }}>{item.planName} · {item.amount}</div>
                  <div className="dim small">{item.transactionId} · {item.maskedInstrument || item.method}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--acc)', fontWeight: 700 }}>{t('PAID')}</span>
                  {item.timestamp && <div className="dim small">{fmtDate(new Date(item.timestamp).toISOString().slice(0, 10))}</div>}
                </div>
              </div>
            ))}
          </div>
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
          🛡️ {t('Secure Payment Gateway & Self-Hosted Independence')}
        </div>
        <div className="muted small" style={{ lineHeight: 1.5 }}>
          {t('Payments are encrypted and synced directly with your athlete profile in Cloud Firestore. Self-hosted owners can also unlock tiers anytime.')}
        </div>
      </div>

      {/* Payment Gateway Checkout Modal */}
      {checkoutPlan && (
        <div className="sheet-backdrop" onClick={() => !payBusy && setCheckoutPlan(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="grab" />
            <div className="row between" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--acc)' }}>
                  {t('SmiTriX Encrypted Payment Gateway')}
                </div>
                <h3 style={{ margin: '2px 0 0' }}>{checkoutPlan.name}</h3>
              </div>
              <button className="iconbtn" onClick={() => setCheckoutPlan(null)} aria-label={t('Close')}>
                <Icon name="xmark" size={16} />
              </button>
            </div>

            {/* Order Summary Banner */}
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{checkoutPlan.name}</div>
                <div className="dim small">
                  {checkoutPlan.id === 'legacy' ? t('Lifetime Founder License') : billingCycle === 'yearly' ? t('Annual Billing (2 Months Free)') : t('Monthly Subscription')}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--acc)' }}>
                {formatPlanAmount(checkoutPlan, currency, billingCycle)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--label-2)', marginBottom: 8 }}>
              {t('Select Payment Method')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => { setPayMethod(pm.id); setPayError('') }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: payMethod === pm.id ? 'color-mix(in srgb, var(--acc) 14%, var(--surface-2))' : 'var(--surface)',
                    border: payMethod === pm.id ? '1.5px solid var(--acc)' : '1px solid var(--border-hairline)',
                    color: 'var(--label)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div className="row" style={{ gap: 10 }}>
                    <Icon name={pm.icon} style={{ color: payMethod === pm.id ? 'var(--acc)' : 'var(--label-2)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t(pm.label)}</div>
                      <div className="dim small" style={{ fontSize: 11 }}>{pm.badge}</div>
                    </div>
                  </div>
                  <Icon name={payMethod === pm.id ? 'checkCircle' : 'dot'} style={{ color: payMethod === pm.id ? 'var(--acc)' : 'var(--label-4)' }} />
                </button>
              ))}
            </div>

            {/* Payment Form Inputs */}
            <form onSubmit={handleCompletePayment} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {payMethod === 'upi' && (
                <div>
                  <label className="small dim" style={{ display: 'block', marginBottom: 4 }}>{t('UPI ID (Google Pay, PhonePe, Paytm, BHIM)')}</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="athlete@okaxis or 9876543210@upi"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    required
                  />
                </div>
              )}

              {payMethod === 'card' && (
                <>
                  <input
                    className="input"
                    type="text"
                    placeholder={t('Cardholder Name')}
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder={t('Card Number (16 digits)')}
                    maxLength={19}
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    required
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      className="input"
                      type="text"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      style={{ flex: 1 }}
                      required
                    />
                    <input
                      className="input"
                      type="password"
                      inputMode="numeric"
                      placeholder="CVC"
                      maxLength={4}
                      value={cardCvc}
                      onChange={e => setCardCvc(e.target.value)}
                      style={{ flex: 1 }}
                      required
                    />
                  </div>
                </>
              )}

              {payMethod === 'razorpay' && (
                <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, fontSize: 12, color: 'var(--label-2)' }}>
                  {t('Express Checkout connects directly to Razorpay / Stripe gateway and activates your entitlement immediately.')}
                </div>
              )}

              <input
                className="input"
                type="text"
                placeholder={t('Promo / Founder Code (optional, e.g. SMITRIX50)')}
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                style={{ fontSize: 13 }}
              />

              {payError && (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255, 69, 58, 0.14)', border: '1px solid var(--red)', color: 'var(--label)', fontSize: 12, fontWeight: 600 }}>
                  {payError}
                </div>
              )}

              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <Button variant="ghost" type="button" onClick={() => setCheckoutPlan(null)} style={{ flex: 1 }}>
                  {t('Cancel')}
                </Button>
                <Button variant="primary" type="submit" disabled={payBusy} style={{ flex: 1.5 }}>
                  {payBusy ? t('Verifying Payment...') : t('Pay {0} & Unlock', formatPlanAmount(checkoutPlan, currency, billingCycle))}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
