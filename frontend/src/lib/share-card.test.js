// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateShareCard, renderShareCardCanvas } from './share-card.js'

describe('share-card generator', () => {
  let mockCtx
  let mockCanvas

  beforeEach(() => {
    mockCtx = {
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
    }

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toBlob: vi.fn(cb => cb(new Blob(['fake-png'], { type: 'image/png' }))),
      toDataURL: vi.fn(() => 'data:image/png;base64,fake'),
    }

    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      if (tag === 'canvas') return mockCanvas
      return document.createElement(tag)
    })
  })

  it('renders a 1080x1350 canvas with workout metrics and branding', () => {
    const canvas = renderShareCardCanvas({
      name: 'Push Day A',
      duration: '52:14',
      volume: 12450,
      sets: 18,
      workSets: 15,
      unit: 'kg',
      date: 'Sunday, Oct 18',
    })

    expect(canvas).toBe(mockCanvas)
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1350)
    expect(mockCtx.fillRect).toHaveBeenCalled()
    expect(mockCtx.fillText).toHaveBeenCalledWith('Push Day A · Sunday, Oct 18', 540, 238)
    expect(mockCtx.fillText).toHaveBeenCalledWith('52:14', 113, 413)
  })

  it('renders PR showcase when prs are present', () => {
    renderShareCardCanvas({
      name: 'Leg Day',
      prs: ['Squat: 140 kg (+5 kg)', 'Leg Press: 280 kg'],
    })

    expect(mockCtx.fillText).toHaveBeenCalledWith('🏆  NEW PERSONAL RECORDS', 119, 759)
    expect(mockCtx.fillText).toHaveBeenCalledWith('•  Squat: 140 kg (+5 kg)', 123, 805)
    expect(mockCtx.fillText).toHaveBeenCalledWith('•  Leg Press: 280 kg', 123, 849)
  })

  it('renders target muscles chip showcase when no PRs are present', () => {
    renderShareCardCanvas({
      name: 'Pull Day',
      prs: [],
      muscles: ['Back', 'Biceps', 'Lats'],
    })

    expect(mockCtx.fillText).toHaveBeenCalledWith('TARGET MUSCLES', 115, 749)
    expect(mockCtx.fillText).toHaveBeenCalledWith('Back  ·  Biceps  ·  Lats', 115, 797)
  })

  it('generateShareCard returns a Blob via canvas.toBlob', async () => {
    const blob = await generateShareCard({
      name: 'Full Body',
      duration: '45:00',
      volume: 8000,
      sets: 12,
    })

    expect(blob).toBeTruthy()
    expect(mockCanvas.toBlob).toHaveBeenCalled()
  })

  it('handles environment with missing canvas safely', () => {
    mockCanvas.getContext = () => null
    const canvas = renderShareCardCanvas({})
    expect(canvas).toBe(mockCanvas)
  })

  it('handles invocation without arguments safely without throwing', async () => {
    const canvas = renderShareCardCanvas()
    expect(canvas).toBe(mockCanvas)

    const blob = await generateShareCard()
    expect(blob).toBeTruthy()
  })

  it('renders session highlight card when both prs and muscles are empty', () => {
    renderShareCardCanvas({
      name: 'Quick Burn',
      prs: [],
      muscles: [],
    })

    expect(mockCtx.fillText).toHaveBeenCalledWith('SESSION HIGHLIGHT', 115, 749)
    expect(mockCtx.fillText).toHaveBeenCalledWith('All planned exercises completed with intensity & focus.', 115, 797)
  })

  it('falls back to toDataURL when toBlob is not supported on canvas', async () => {
    delete mockCanvas.toBlob
    // Base64 encoding of small dummy binary
    mockCanvas.toDataURL = vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

    const blob = await generateShareCard({ name: 'Fallback Test' })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })
})
