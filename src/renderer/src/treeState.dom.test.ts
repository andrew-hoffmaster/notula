// @vitest-environment jsdom
/** Browser-dependent tree-state persistence (localStorage). */
import { beforeEach, describe, expect, it } from 'vitest'
import { loadList, saveList } from './treeState.js'

describe('list persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a saved list', () => {
    saveList('k', ['a', 'b'])
    expect(loadList('k')).toEqual(['a', 'b'])
  })

  it('returns [] for a missing key', () => {
    expect(loadList('nope')).toEqual([])
  })

  it('returns [] for malformed JSON', () => {
    localStorage.setItem('k', 'not json')
    expect(loadList('k')).toEqual([])
  })

  it('filters non-string entries', () => {
    localStorage.setItem('k', JSON.stringify(['a', 3, null, 'b']))
    expect(loadList('k')).toEqual(['a', 'b'])
  })
})
