/** Tests for the tabbed-buffer reducer. */
import { describe, expect, it } from 'vitest'
import {
  activeBuffer,
  buffersReducer,
  initialBuffersState,
  resolveExternalChange,
  type Buffer,
  type BuffersState
} from './buffers.js'

const open = (relPath: string, content = '') =>
  ({ type: 'open', relPath, name: relPath, content }) as const

describe('buffersReducer', () => {
  it('opens a file as a new active tab', () => {
    const s = buffersReducer(initialBuffersState, open('a.md', 'A'))
    expect(s.buffers).toHaveLength(1)
    expect(s.active).toBe(0)
    expect(activeBuffer(s)?.content).toBe('A')
  })

  it('re-opening an existing file focuses it instead of duplicating', () => {
    let s = buffersReducer(initialBuffersState, open('a.md'))
    s = buffersReducer(s, open('b.md'))
    s = buffersReducer(s, open('a.md'))
    expect(s.buffers).toHaveLength(2)
    expect(s.active).toBe(0)
  })

  it('marks a buffer dirty on edit and clean on save', () => {
    let s = buffersReducer(initialBuffersState, open('a.md', 'A'))
    s = buffersReducer(s, { type: 'edit', relPath: 'a.md', content: 'A!' })
    expect(activeBuffer(s)).toMatchObject({ content: 'A!', dirty: true })
    s = buffersReducer(s, { type: 'saved', relPath: 'a.md' })
    expect(activeBuffer(s)?.dirty).toBe(false)
  })

  it('activate focuses an existing tab and ignores unknown paths', () => {
    let s = buffersReducer(initialBuffersState, open('a.md'))
    s = buffersReducer(s, open('b.md'))
    s = buffersReducer(s, { type: 'activate', relPath: 'a.md' })
    expect(s.active).toBe(0)
    const same = buffersReducer(s, { type: 'activate', relPath: 'missing.md' })
    expect(same).toBe(s)
  })

  it('closing the active tab shifts focus left', () => {
    let s: BuffersState = initialBuffersState
    s = buffersReducer(s, open('a.md'))
    s = buffersReducer(s, open('b.md'))
    s = buffersReducer(s, open('c.md')) // active = 2
    s = buffersReducer(s, { type: 'close', relPath: 'c.md' })
    expect(s.buffers.map((b) => b.relPath)).toEqual(['a.md', 'b.md'])
    expect(s.active).toBe(1)
  })

  it('reset closes all buffers', () => {
    let s = buffersReducer(initialBuffersState, open('a.md'))
    s = buffersReducer(s, open('b.md'))
    s = buffersReducer(s, { type: 'reset' })
    expect(s).toEqual(initialBuffersState)
  })

  it('closing the last remaining tab resets to empty', () => {
    let s = buffersReducer(initialBuffersState, open('a.md'))
    s = buffersReducer(s, { type: 'close', relPath: 'a.md' })
    expect(s.buffers).toHaveLength(0)
    expect(s.active).toBe(-1)
    expect(activeBuffer(s)).toBeNull()
  })

  it('closing a tab left of the active one keeps the same buffer focused', () => {
    let s: BuffersState = initialBuffersState
    s = buffersReducer(s, open('a.md'))
    s = buffersReducer(s, open('b.md')) // active = 1 (b.md)
    s = buffersReducer(s, { type: 'close', relPath: 'a.md' })
    expect(s.active).toBe(0)
    expect(activeBuffer(s)?.relPath).toBe('b.md')
  })

  it('rename updates an open buffer’s path and name', () => {
    let s = buffersReducer(initialBuffersState, open('a.md', 'x'))
    s = buffersReducer(s, { type: 'rename', from: 'a.md', to: 'b.md', name: 'b.md' })
    expect(activeBuffer(s)).toMatchObject({ relPath: 'b.md', name: 'b.md', content: 'x' })
  })

  it('reload replaces content from disk and clears dirty', () => {
    let s = buffersReducer(initialBuffersState, open('a.md', 'old'))
    s = buffersReducer(s, { type: 'edit', relPath: 'a.md', content: 'mine' })
    s = buffersReducer(s, { type: 'reload', relPath: 'a.md', content: 'theirs' })
    expect(activeBuffer(s)).toMatchObject({ content: 'theirs', dirty: false })
  })
})

describe('resolveExternalChange', () => {
  const buf = (content: string, dirty: boolean): Buffer => ({
    relPath: 'a.md',
    name: 'a.md',
    content,
    dirty
  })

  it('reloads a clean buffer silently', () => {
    expect(resolveExternalChange(buf('x', false), 'y')).toBe('reload')
  })

  it('ignores a dirty buffer identical to disk', () => {
    expect(resolveExternalChange(buf('same', true), 'same')).toBe('ignore')
  })

  it('flags a conflict for a dirty buffer that differs from disk', () => {
    expect(resolveExternalChange(buf('mine', true), 'theirs')).toBe('conflict')
  })
})
