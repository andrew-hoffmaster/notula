// @vitest-environment jsdom
/** Browser-dependent appearance behaviour (localStorage + document class). */
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE, applyChrome, loadAppearance, saveAppearance } from './appearance.js'

describe('appearance persistence', () => {
  beforeEach(() => localStorage.clear())

  it('loads defaults when nothing is stored', () => {
    expect(loadAppearance()).toEqual(DEFAULT_APPEARANCE)
  })

  it('round-trips a saved appearance', () => {
    const a = { ...DEFAULT_APPEARANCE, themeId: 'dracula', fontSize: 20 }
    saveAppearance(a)
    expect(loadAppearance()).toEqual(a)
  })

  it('recovers from malformed stored JSON', () => {
    localStorage.setItem('notula:appearance', '{ broken')
    expect(loadAppearance()).toEqual(DEFAULT_APPEARANCE)
  })
})

describe('applyChrome', () => {
  it('toggles the document dark class from the active theme', () => {
    applyChrome({ ...DEFAULT_APPEARANCE, themeId: 'notula' })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyChrome({ ...DEFAULT_APPEARANCE, themeId: 'light' })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
