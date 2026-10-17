import { describe, it, expect, beforeEach } from 'vitest'
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasApiKey,
  getHevyApiKey,
  setHevyApiKey,
  clearHevyApiKey,
} from './coach-secrets.js'

describe('coach-secrets', () => {
  beforeEach(async () => {
    await clearApiKey()
    await clearApiKey('anthropic')
    await clearApiKey('openai')
    await clearApiKey('gemini')
    await clearApiKey('compatible')
    await clearHevyApiKey()
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear()
    }
  })

  describe('AI Coach API Keys', () => {
    it('saves and retrieves general API key', async () => {
      expect(await getApiKey()).toBeNull()
      await setApiKey('sk-ant-test-general')
      expect(await getApiKey()).toBe('sk-ant-test-general')
      expect(await hasApiKey()).toBe(true)

      await clearApiKey()
      expect(await getApiKey()).toBeNull()
      expect(await hasApiKey()).toBe(false)
    })

    it('saves and retrieves provider-specific API keys', async () => {
      await setApiKey('sk-ant-1234', 'anthropic')
      await setApiKey('sk-openai-5678', 'openai')

      expect(await getApiKey('anthropic')).toBe('sk-ant-1234')
      expect(await getApiKey('openai')).toBe('sk-openai-5678')
      expect(await hasApiKey('anthropic')).toBe(true)
      expect(await hasApiKey('openai')).toBe(true)
      expect(await hasApiKey('gemini')).toBe(false)
    })

    it('saves and retrieves general key', async () => {
      await setApiKey('sk-general-key')
      expect(await getApiKey()).toBe('sk-general-key')
      expect(await hasApiKey()).toBe(true)
    })


    it('clearing a specific provider key does not clear other provider keys', async () => {
      await setApiKey('sk-ant-1234', 'anthropic')
      await setApiKey('sk-openai-5678', 'openai')

      await clearApiKey('anthropic')
      expect(await getApiKey('anthropic')).toBeNull()
      expect(await getApiKey('openai')).toBe('sk-openai-5678')
      expect(await hasApiKey('openai')).toBe(true)
    })

    it('clears key when empty string or whitespace is provided', async () => {
      await setApiKey('sk-ant-1234', 'anthropic')
      expect(await hasApiKey('anthropic')).toBe(true)

      await setApiKey('   ', 'anthropic')
      expect(await getApiKey('anthropic')).toBeNull()
      expect(await hasApiKey('anthropic')).toBe(false)
    })
  })

  describe('Hevy API Keys', () => {
    it('saves, retrieves, and clears Hevy API key', async () => {
      expect(await getHevyApiKey()).toBeNull()
      await setHevyApiKey('hevy-pro-key-abc')
      expect(await getHevyApiKey()).toBe('hevy-pro-key-abc')

      await clearHevyApiKey()
      expect(await getHevyApiKey()).toBeNull()
    })

    it('clears Hevy key when empty string or whitespace is passed', async () => {
      await setHevyApiKey('hevy-key-1')
      expect(await getHevyApiKey()).toBe('hevy-key-1')

      await setHevyApiKey('  ')
      expect(await getHevyApiKey()).toBeNull()
    })
  })
})
