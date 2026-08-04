/** Tests for the pure appearance model. */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPEARANCE,
  PRESETS,
  activeColors,
  fontStack,
  normalizeAppearance
} from './appearance.js'

describe('activeColors', () => {
  it('returns the preset palette for a known theme id', () => {
    expect(activeColors({ ...DEFAULT_APPEARANCE, themeId: 'dracula' })).toBe(PRESETS.dracula)
  })
  it('returns the custom palette when themeId is custom', () => {
    const custom = { dark: true, bg: '#000', fg: '#fff', accent: '#f00', heading: '#0f0' }
    expect(activeColors({ ...DEFAULT_APPEARANCE, themeId: 'custom', custom })).toBe(custom)
  })
  it('falls back to light for an unknown theme id', () => {
    expect(activeColors({ ...DEFAULT_APPEARANCE, themeId: 'nope' })).toBe(PRESETS.light)
  })
})

describe('normalizeAppearance', () => {
  it('fills defaults for missing fields', () => {
    expect(normalizeAppearance({})).toEqual(DEFAULT_APPEARANCE)
  })
  it('preserves provided values and merges custom colors', () => {
    const a = normalizeAppearance({ fontSize: 20, custom: { accent: '#123456' } })
    expect(a.fontSize).toBe(20)
    expect(a.custom.accent).toBe('#123456')
    expect(a.custom.bg).toBe(DEFAULT_APPEARANCE.custom.bg)
  })
  it('ignores wrong-typed fields', () => {
    expect(normalizeAppearance({ fontSize: 'big' }).fontSize).toBe(DEFAULT_APPEARANCE.fontSize)
  })
})

describe('fontStack', () => {
  it('resolves a known family key', () => {
    expect(fontStack({ ...DEFAULT_APPEARANCE, fontFamily: 'mono' })).toMatch(/monospace/)
  })
  it('falls back to sans for an unknown key', () => {
    expect(fontStack({ ...DEFAULT_APPEARANCE, fontFamily: 'zzz' })).toMatch(/sans-serif/)
  })
})

describe('presets', () => {
  it('every preset has the required palette fields', () => {
    for (const [id, c] of Object.entries(PRESETS)) {
      expect(c, id).toMatchObject({
        dark: expect.any(Boolean),
        bg: expect.any(String),
        fg: expect.any(String),
        accent: expect.any(String),
        heading: expect.any(String)
      })
    }
  })
})
