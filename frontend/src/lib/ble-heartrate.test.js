import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseHeartRateMeasurement,
  getHeartRateZone,
  calculateHeartRateZone,
  BleHeartRateController,
  HR_ZONES,
} from './ble-heartrate.js'

describe('ble-heartrate module', () => {
  describe('parseHeartRateMeasurement', () => {
    it('returns empty fallback on null or invalid dataview', () => {
      expect(parseHeartRateMeasurement(null)).toEqual({
        bpm: 0,
        contactDetected: null,
        energyExpended: null,
        rrIntervals: [],
      })
      expect(parseHeartRateMeasurement(new DataView(new ArrayBuffer(1)))).toEqual({
        bpm: 0,
        contactDetected: null,
        energyExpended: null,
        rrIntervals: [],
      })
    })

    it('parses standard 8-bit heart rate format (flag bit 0 = 0)', () => {
      const buffer = new ArrayBuffer(2)
      const view = new DataView(buffer)
      view.setUint8(0, 0b00000000) // 8-bit BPM, no contact, no energy, no RR
      view.setUint8(1, 135)        // 135 BPM

      const res = parseHeartRateMeasurement(view)
      expect(res.bpm).toBe(135)
      expect(res.contactDetected).toBeNull()
      expect(res.energyExpended).toBeNull()
      expect(res.rrIntervals).toEqual([])
    })

    it('parses 16-bit heart rate format (flag bit 0 = 1)', () => {
      const buffer = new ArrayBuffer(3)
      const view = new DataView(buffer)
      view.setUint8(0, 0b00000001) // 16-bit BPM
      view.setUint16(1, 260, true) // 260 BPM (little endian)

      const res = parseHeartRateMeasurement(view)
      expect(res.bpm).toBe(260)
    })

    it('parses sensor contact status bits', () => {
      // Contact supported (bit 1 = 1) and detected (bit 2 = 1)
      const buf1 = new ArrayBuffer(2)
      const view1 = new DataView(buf1)
      view1.setUint8(0, 0b00000110)
      view1.setUint8(1, 80)
      expect(parseHeartRateMeasurement(view1).contactDetected).toBe(true)

      // Contact supported (bit 1 = 1) and not detected (bit 2 = 0)
      const buf2 = new ArrayBuffer(2)
      const view2 = new DataView(buf2)
      view2.setUint8(0, 0b00000010)
      view2.setUint8(1, 80)
      expect(parseHeartRateMeasurement(view2).contactDetected).toBe(false)
    })

    it('parses energy expended (flag bit 3 = 1)', () => {
      const buffer = new ArrayBuffer(4)
      const view = new DataView(buffer)
      view.setUint8(0, 0b00001000) // 8-bit BPM + energy expended
      view.setUint8(1, 140)
      view.setUint16(2, 450, true) // 450 kJ

      const res = parseHeartRateMeasurement(view)
      expect(res.bpm).toBe(140)
      expect(res.energyExpended).toBe(450)
    })

    it('parses RR-interval values (flag bit 4 = 1)', () => {
      const buffer = new ArrayBuffer(6)
      const view = new DataView(buffer)
      view.setUint8(0, 0b00010000) // 8-bit BPM + RR intervals
      view.setUint8(1, 120)
      view.setUint16(2, 1024, true) // 1024 / 1024 = 1000ms
      view.setUint16(4, 512, true)  // 512 / 1024 = 500ms

      const res = parseHeartRateMeasurement(view)
      expect(res.bpm).toBe(120)
      expect(res.rrIntervals).toEqual([1000, 500])
    })
  })

  describe('getHeartRateZone', () => {
    const maxHr = 200

    it('handles rest / low bpm', () => {
      expect(getHeartRateZone(0, maxHr).name).toBe('Rest')
      expect(getHeartRateZone(-10, maxHr).name).toBe('Rest')
      expect(getHeartRateZone(NaN, maxHr).name).toBe('Rest')
      expect(getHeartRateZone(80, maxHr).name).toBe('Rest') // 40% < 50%
    })

    it('identifies Zone 1 Warmup (50-59%)', () => {
      const z = getHeartRateZone(110, maxHr) // 55%
      expect(z.zone).toBe(1)
      expect(z.name).toBe('Warmup')
      expect(z.pct).toBe(55)
    })

    it('identifies Zone 2 Fat Burn (60-69%)', () => {
      const z = getHeartRateZone(130, maxHr) // 65%
      expect(z.zone).toBe(2)
      expect(z.name).toBe('Fat Burn')
      expect(z.pct).toBe(65)
    })

    it('identifies Zone 3 Aerobic (70-79%)', () => {
      const z = getHeartRateZone(150, maxHr) // 75%
      expect(z.zone).toBe(3)
      expect(z.name).toBe('Aerobic')
      expect(z.pct).toBe(75)
    })

    it('identifies Zone 4 Anaerobic (80-89%)', () => {
      const z = getHeartRateZone(170, maxHr) // 85%
      expect(z.zone).toBe(4)
      expect(z.name).toBe('Anaerobic')
      expect(z.pct).toBe(85)
    })

    it('identifies Zone 5 Max/Peak (>= 90%)', () => {
      const z = getHeartRateZone(190, maxHr) // 95%
      expect(z.zone).toBe(5)
      expect(z.name).toBe('Max/Peak')
      expect(z.pct).toBe(95)
    })

    it('exports calculateHeartRateZone alias identical to getHeartRateZone', () => {
      expect(calculateHeartRateZone(150, maxHr)).toEqual(getHeartRateZone(150, maxHr))
    })
  })

  describe('BleHeartRateController', () => {
    let controller

    beforeEach(() => {
      controller = new BleHeartRateController()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('starts disconnected and handles manual BPM update', () => {
      expect(controller.getState().status).toBe('disconnected')
      expect(controller.getState().bpm).toBeNull()

      controller.setBpmManual(140)
      expect(controller.getState().bpm).toBe(140)
      expect(controller.getState().zone.name).toBe('Aerobic')

      controller.setBpmManual(null)
      expect(controller.getState().bpm).toBeNull()
    })

    it('updates maxHr and updates current zone', () => {
      controller.setBpmManual(160)
      expect(controller.getState().zone.pct).toBe(84) // 160 / 190

      controller.setMaxHr(200)
      expect(controller.getState().maxHr).toBe(200)
      expect(controller.getState().zone.pct).toBe(80) // 160 / 200
      expect(controller.calculateHeartRateZone(140).name).toBe('Aerobic')
    })

    it('notifies subscribers on state changes', () => {
      const listener = vi.fn()
      const unsub = controller.subscribe(listener)

      expect(listener).toHaveBeenCalledTimes(1)
      controller.setBpmManual(150)
      expect(listener).toHaveBeenCalledTimes(2)

      unsub()
      controller.setBpmManual(160)
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('handles disconnect and cleanup', async () => {
      controller.status = 'connected'
      controller.bpm = 145
      controller.zone = getHeartRateZone(145, 190)

      await controller.disconnect()
      expect(controller.status).toBe('disconnected')
      expect(controller.bpm).toBeNull()
      expect(controller.zone).toBeNull()
    })

    it('handles bluetooth unsupported gracefully', async () => {
      vi.spyOn(controller, 'isSupported').mockReturnValue(false)
      const res = await controller.connect()
      expect(res).toBe(false)
      expect(controller.status).toBe('error')
      expect(controller.error).toContain('Web Bluetooth is not supported')
    })

    it('connects to mock Bluetooth device and receives characteristic value events', async () => {
      vi.spyOn(controller, 'isSupported').mockReturnValue(true)

      const mockChar = {
        startNotifications: vi.fn().mockResolvedValue(undefined),
        stopNotifications: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }

      const mockService = {
        getCharacteristic: vi.fn().mockResolvedValue(mockChar),
      }

      const mockServer = {
        getPrimaryService: vi.fn().mockResolvedValue(mockService),
      }

      const mockDevice = {
        name: 'Polar H10',
        gatt: {
          connect: vi.fn().mockResolvedValue(mockServer),
          disconnect: vi.fn(),
          connected: true,
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }

      Object.defineProperty(navigator, 'bluetooth', {
        value: {
          requestDevice: vi.fn().mockResolvedValue(mockDevice),
        },
        configurable: true,
        writable: true,
      })

      const ok = await controller.connect()
      expect(ok).toBe(true)
      expect(controller.status).toBe('connected')
      expect(controller.deviceName).toBe('Polar H10')

      // Simulate a characteristic value change event
      const buf = new ArrayBuffer(2)
      const view = new DataView(buf)
      view.setUint8(0, 0)
      view.setUint8(1, 155) // 155 BPM

      controller._onCharacteristicValueChanged({ target: { value: view } })
      expect(controller.bpm).toBe(155)
      expect(controller.zone.name).toBe('Anaerobic')

      // Simulate disconnect event
      controller._onDisconnected()
      expect(controller.status).toBe('disconnected')
      expect(controller.bpm).toBeNull()
    })
  })
})
