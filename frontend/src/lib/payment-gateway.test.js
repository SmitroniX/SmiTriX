// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { formatPlanAmount, processPaymentCheckout } from './payment-gateway.js'
import { getFreePlan, getProPlan, getLegacyPlan } from './subscription-plans.js'

describe('Payment Gateway & Subscription Checkout', () => {
  it('formats INR and USD plan amounts for monthly, yearly, and lifetime tiers', () => {
    expect(formatPlanAmount(getFreePlan(), 'INR', 'monthly')).toBe('₹0')
    expect(formatPlanAmount(getProPlan(), 'INR', 'monthly')).toBe('₹299')
    expect(formatPlanAmount(getProPlan(), 'INR', 'yearly')).toBe('₹2,990')
    expect(formatPlanAmount(getProPlan(), 'USD', 'monthly')).toBe('$4.99')
    expect(formatPlanAmount(getLegacyPlan(), 'USD', 'monthly')).toBe('$49.99')
  })

  it('validates UPI ID and returns verified receipt for UPI payment', async () => {
    await expect(
      processPaymentCheckout({ planId: 'pro', method: 'upi', upiId: 'invalid-upi' })
    ).rejects.toThrow(/valid UPI ID/i)

    const receipt = await processPaymentCheckout({
      planId: 'pro',
      method: 'upi',
      currency: 'INR',
      billingCycle: 'monthly',
      upiId: 'athlete@okaxis',
      couponCode: 'SMITRIX50'
    })
    expect(receipt.status).toBe('verified')
    expect(receipt.planId).toBe('pro')
    expect(receipt.discountPct).toBe(50)
    expect(receipt.transactionId).toMatch(/^tx_/)
  })

  it('validates card details for credit/debit card checkout', async () => {
    await expect(
      processPaymentCheckout({ planId: 'legacy', method: 'card', cardNumber: '1234' })
    ).rejects.toThrow(/16-digit card number/i)

    const receipt = await processPaymentCheckout({
      planId: 'legacy',
      method: 'card',
      currency: 'USD',
      cardNumber: '4242424242424242',
      cardExpiry: '12/29',
      cardCvc: '123',
      cardName: 'Asmit Jogdand'
    })
    expect(receipt.status).toBe('verified')
    expect(receipt.planId).toBe('legacy')
    expect(receipt.maskedInstrument).toBe('•••• 4242')
  })
})
