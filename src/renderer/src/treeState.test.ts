/** Tests for the pure file-tree state helpers. */
import { describe, expect, it } from 'vitest'
import type { FileNode } from '@shared/types.js'
import {
  collectFilePaths,
  existingFavorites,
  storageKey,
  toggle,
  uniqueMarkdownName
} from './treeState.js'

const tree: FileNode[] = [
  {
    relPath: 'projects',
    name: 'projects',
    isDir: true,
    children: [{ relPath: 'projects/design.md', name: 'design.md', isDir: false }]
  },
  { relPath: 'note.md', name: 'note.md', isDir: false }
]

describe('toggle', () => {
  it('adds an absent item', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b'])
  })
  it('removes a present item', () => {
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
  })
  it('does not mutate the input', () => {
    const input = ['a']
    toggle(input, 'b')
    expect(input).toEqual(['a'])
  })
})

describe('collectFilePaths', () => {
  it('flattens files across folders, excluding directories', () => {
    expect(collectFilePaths(tree)).toEqual(['projects/design.md', 'note.md'])
  })
})

describe('existingFavorites', () => {
  it('drops favorites whose files are gone and preserves order', () => {
    const favs = ['gone.md', 'note.md', 'projects/design.md']
    expect(existingFavorites(favs, tree)).toEqual(['note.md', 'projects/design.md'])
  })
})

describe('uniqueMarkdownName', () => {
  it('uses the plain name when free', () => {
    expect(uniqueMarkdownName('report', [])).toBe('report.md')
  })
  it('suffixes to avoid collisions', () => {
    expect(uniqueMarkdownName('report', ['report.md'])).toBe('report-2.md')
    expect(uniqueMarkdownName('report', ['report.md', 'report-2.md'])).toBe('report-3.md')
  })
})

describe('storageKey', () => {
  it('namespaces per kind and vault', () => {
    expect(storageKey('favs', '/vault')).toBe('notula:favs:/vault')
    expect(storageKey('expanded', '/vault')).toBe('notula:expanded:/vault')
  })
})
