import { describe, expect, test } from 'vitest'
import ja from '../locales/ja.js'
import pt from '../locales/pt.js'
import { DATE_LOCALES, LANGS } from './i18n-core.js'

const placeholders = value => [...String(value).matchAll(/\{\d+\}/g)].map(match => match[0]).sort()

describe('Japanese locale (ja)', () => {
  test('is registered in LANGS and DATE_LOCALES', () => {
    expect(LANGS.ja).toBe('日本語')
    expect(DATE_LOCALES.ja).toBe('ja-JP')
  })

  test('matches the reference key set exactly', () => {
    const jaKeys = Object.keys(ja).sort()
    const ptKeys = Object.keys(pt).sort()
    expect(jaKeys).toEqual(ptKeys)
    expect(jaKeys.length).toBe(1347)
  })

  test('preserves all interpolation placeholders', () => {
    for (const [source, translated] of Object.entries(ja)) {
      expect(placeholders(translated), `Mismatch in key: ${source}`).toEqual(placeholders(source))
    }
  })

  test('contains core fitness and feature terms', () => {
    expect(ja['Heart Rate Monitor']).toBe('心拍数モニター')
    expect(ja['Form Check Video']).toBe('フォームチェック動画')
    expect(ja['Sync Now']).toBe('今すぐ同期')
    expect(ja['Readiness Index']).toBe('回復レディネス指数')
    expect(ja['reps']).toBe('レップ')
    expect(ja['Warm-up sets']).toBe('ウォームアップセット')
  })
})
