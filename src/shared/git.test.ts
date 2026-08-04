/** Tests for the pure git helpers. */
import { describe, expect, it } from 'vitest'
import { classify, isStaged, isUnstaged, parseDiff, type GitFileChange } from './git.js'

describe('classify', () => {
  it('marks untracked files', () => {
    expect(classify('?', '?')).toEqual({ letter: 'U', kind: 'untracked', staged: false })
  })
  it('marks conflicts', () => {
    expect(classify('U', 'U').kind).toBe('conflict')
  })
  it('classifies a staged modification', () => {
    expect(classify('M', ' ')).toEqual({ letter: 'M', kind: 'modified', staged: true })
  })
  it('classifies an unstaged modification', () => {
    expect(classify(' ', 'M')).toEqual({ letter: 'M', kind: 'modified', staged: false })
  })
  it('classifies additions and deletions', () => {
    expect(classify('A', ' ').kind).toBe('added')
    expect(classify(' ', 'D').kind).toBe('deleted')
  })
})

describe('staged / unstaged predicates', () => {
  const c = (index: string, working: string): GitFileChange => ({ path: 'x', index, working })
  it('detects staged changes', () => {
    expect(isStaged(c('M', ' '))).toBe(true)
    expect(isStaged(c(' ', 'M'))).toBe(false)
    expect(isStaged(c('?', '?'))).toBe(false)
  })
  it('detects working changes including untracked', () => {
    expect(isUnstaged(c(' ', 'M'))).toBe(true)
    expect(isUnstaged(c('?', '?'))).toBe(true)
    expect(isUnstaged(c('M', ' '))).toBe(false)
  })
})

describe('parseDiff', () => {
  it('returns [] for empty input', () => {
    expect(parseDiff('')).toEqual([])
  })
  it('types added, deleted, context, hunk, and meta lines', () => {
    const diff = [
      'diff --git a/x b/x',
      '@@ -1,2 +1,2 @@',
      ' context',
      '-old',
      '+new'
    ].join('\n')
    expect(parseDiff(diff)).toEqual([
      { type: 'meta', text: 'diff --git a/x b/x' },
      { type: 'hunk', text: '@@ -1,2 +1,2 @@' },
      { type: 'context', text: 'context' },
      { type: 'del', text: 'old' },
      { type: 'add', text: 'new' }
    ])
  })
})
