/**
 * Web Bluetooth API Heart Rate Service (UUID 0x180D, 0x2A37).
 * Handles BLE sensor pairing, Apple Watch / Wear OS companion connection,
 * heart rate measurement decoding, and 5-zone HR classification.
 */

export const HEART_RATE_SERVICE_UUID = 'heart_rate'
export const HEART_RATE_SERVICE_NUM = 0x180D
export const HEART_RATE_MEASUREMENT_UUID = 'heart_rate_measurement'
export const HEART_RATE_MEASUREMENT_NUM = 0x2A37

export const HR_ZONES = Object.freeze({
  REST: { zone: 0, name: 'Rest', minPct: 0, maxPct: 49, color: 'var(--label-3, #8e8e93)' },
  WARMUP: { zone: 1, name: 'Warmup', minPct: 50, maxPct: 59, color: 'var(--blue, #3b82f6)' },
  FAT_BURN: { zone: 2, name: 'Fat Burn', minPct: 60, maxPct: 69, color: 'var(--green, #22c55e)' },
  AEROBIC: { zone: 3, name: 'Aerobic', minPct: 70, maxPct: 79, color: 'var(--amber, #eab308)' },
  ANAEROBIC: { zone: 4, name: 'Anaerobic', minPct: 80, maxPct: 89, color: 'var(--orange, #f97316)' },
  PEAK: { zone: 5, name: 'Max/Peak', minPct: 90, maxPct: 300, color: 'var(--red, #ef4444)' },
})

/**
 * Parses Bluetooth Heart Rate Measurement Characteristic (0x2A37) DataView.
 * Standard Bluetooth SIG specification.
 *
 * @param {DataView} dataView
 * @returns {{ bpm: number, contactDetected: boolean|null, energyExpended: number|null, rrIntervals: number[] }}
 */
export function parseHeartRateMeasurement(dataView) {
  if (!dataView || typeof dataView.getUint8 !== 'function' || dataView.byteLength < 2) {
    return { bpm: 0, contactDetected: null, energyExpended: null, rrIntervals: [] }
  }

  const flags = dataView.getUint8(0)
  const is16BitBpm = (flags & 0x01) !== 0
  let offset = 1

  let bpm = 0
  if (is16BitBpm) {
    if (dataView.byteLength >= offset + 2) {
      bpm = dataView.getUint16(offset, /* littleEndian */ true)
      offset += 2
    }
  } else {
    bpm = dataView.getUint8(offset)
    offset += 1
  }

  // Bits 1 & 2: Sensor contact
  let contactDetected = null
  const contactSupported = (flags & 0x02) !== 0
  if (contactSupported) {
    contactDetected = (flags & 0x04) !== 0
  }

  // Bit 3: Energy Expended (uint16 in kiloJoules)
  let energyExpended = null
  const energyExpendedPresent = (flags & 0x08) !== 0
  if (energyExpendedPresent && dataView.byteLength >= offset + 2) {
    energyExpended = dataView.getUint16(offset, true)
    offset += 2
  }

  // Bit 4: RR-Intervals (resolution 1/1024s)
  const rrIntervals = []
  const rrPresent = (flags & 0x10) !== 0
  if (rrPresent) {
    while (offset + 2 <= dataView.byteLength) {
      const rrRaw = dataView.getUint16(offset, true)
      // convert 1/1024 second units to milliseconds
      const rrMs = Math.round((rrRaw / 1024) * 1000)
      rrIntervals.push(rrMs)
      offset += 2
    }
  }

  return { bpm, contactDetected, energyExpended, rrIntervals }
}

/**
 * Categorize BPM into 5 standard physiological heart rate training zones.
 *
 * @param {number} bpm
 * @param {number} [maxHr=190]
 * @returns {{ zone: number, name: string, pct: number, color: string }}
 */
export function getHeartRateZone(bpm, maxHr = 190) {
  const safeBpm = Number(bpm)
  const safeMax = Number(maxHr) > 0 ? Number(maxHr) : 190

  if (!Number.isFinite(safeBpm) || safeBpm <= 0) {
    return { ...HR_ZONES.REST, pct: 0 }
  }

  const pct = Math.round((safeBpm / safeMax) * 100)

  if (pct < 50) {
    return { ...HR_ZONES.REST, pct }
  } else if (pct < 60) {
    return { ...HR_ZONES.WARMUP, pct }
  } else if (pct < 70) {
    return { ...HR_ZONES.FAT_BURN, pct }
  } else if (pct < 80) {
    return { ...HR_ZONES.AEROBIC, pct }
  } else if (pct < 90) {
    return { ...HR_ZONES.ANAEROBIC, pct }
  } else {
    return { ...HR_ZONES.PEAK, pct }
  }
}

/**
 * BleHeartRateController handles Web Bluetooth device discovery, connection,
 * GATT notifications, disconnection handling, and companion app pairing info.
 */
export class BleHeartRateController {
  constructor() {
    this.status = 'disconnected' // 'disconnected' | 'connecting' | 'connected' | 'error'
    this.device = null
    this.server = null
    this.characteristic = null
    this.bpm = null
    this.zone = null
    this.deviceName = ''
    this.error = null
    this.maxHr = 190
    this.listeners = new Set()

    this._onDisconnected = this._onDisconnected.bind(this)
    this._onCharacteristicValueChanged = this._onCharacteristicValueChanged.bind(this)
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  setMaxHr(maxHr) {
    const n = Number(maxHr)
    if (n > 80 && n < 240) {
      this.maxHr = n
      if (this.bpm) {
        this.zone = getHeartRateZone(this.bpm, this.maxHr)
      }
      this._notify()
    }
  }

  getState() {
    return {
      status: this.status,
      bpm: this.bpm,
      zone: this.zone,
      deviceName: this.deviceName,
      error: this.error,
      maxHr: this.maxHr,
      isSupported: this.isSupported(),
    }
  }

  subscribe(listener) {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  _notify() {
    const state = this.getState()
    for (const fn of this.listeners) {
      try { fn(state) } catch (e) { console.error('BLE listener error', e) }
    }
  }

  async connect() {
    if (!this.isSupported()) {
      this.status = 'error'
      this.error = 'Web Bluetooth is not supported on this browser.'
      this._notify()
      return false
    }

    try {
      this.status = 'connecting'
      this.error = null
      this._notify()

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      })

      this.device = device
      this.deviceName = device.name || 'Heart Rate Monitor'
      device.addEventListener('gattserverdisconnected', this._onDisconnected)

      const server = await device.gatt.connect()
      this.server = server

      const service = await server.getPrimaryService('heart_rate')
      const characteristic = await service.getCharacteristic('heart_rate_measurement')
      this.characteristic = characteristic

      await characteristic.startNotifications()
      characteristic.addEventListener('characteristicvaluechanged', this._onCharacteristicValueChanged)

      this.status = 'connected'
      this._notify()
      return true
    } catch (err) {
      if (err.name === 'NotFoundError') {
        // User cancelled picker
        this.status = 'disconnected'
        this.error = null
      } else {
        this.status = 'error'
        this.error = err.message || 'Failed to connect to BLE device'
      }
      this._notify()
      return false
    }
  }

  _onCharacteristicValueChanged(event) {
    try {
      const dataView = event.target.value
      const { bpm } = parseHeartRateMeasurement(dataView)
      if (bpm > 0) {
        this.bpm = bpm
        this.zone = getHeartRateZone(bpm, this.maxHr)
        this._notify()
      }
    } catch (e) {
      console.warn('Error reading heart rate measurement', e)
    }
  }

  _onDisconnected() {
    this.status = 'disconnected'
    this.characteristic = null
    this.server = null
    this.bpm = null
    this.zone = null
    this._notify()
  }

  async disconnect() {
    try {
      if (this.characteristic) {
        try {
          await this.characteristic.stopNotifications()
          this.characteristic.removeEventListener('characteristicvaluechanged', this._onCharacteristicValueChanged)
        } catch { /* ignore */ }
      }
      if (this.device) {
        this.device.removeEventListener('gattserverdisconnected', this._onDisconnected)
        if (this.device.gatt?.connected) {
          this.device.gatt.disconnect()
        }
      }
    } finally {
      this._onDisconnected()
    }
  }

  /**
   * For testing or manual companion simulated updates
   */
  setBpmManual(bpm) {
    if (bpm == null) {
      this.bpm = null
      this.zone = null
    } else {
      this.bpm = bpm
      this.zone = getHeartRateZone(bpm, this.maxHr)
    }
    this._notify()
  }
}

export const bleHeartRate = new BleHeartRateController()
