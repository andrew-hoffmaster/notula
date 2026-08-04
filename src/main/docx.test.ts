/** Tests for the pure DOCX import helpers. */
import { describe, expect, it } from 'vitest'
import { assetFilename, extForContentType, htmlToMarkdown, validateDocxExt } from './docx.js'

describe('extForContentType', () => {
  it('maps common image MIME types', () => {
    expect(extForContentType('image/png')).toBe('png')
    expect(extForContentType('image/jpeg')).toBe('jpg')
    expect(extForContentType('image/svg+xml')).toBe('svg')
  })
  it('is case-insensitive', () => {
    expect(extForContentType('IMAGE/GIF')).toBe('gif')
  })
  it('falls back to png for unknown types', () => {
    expect(extForContentType('image/unknown')).toBe('png')
  })
})

describe('assetFilename', () => {
  it('produces a stable content-hashed name', () => {
    const a = assetFilename(Buffer.from('hello'), 'png')
    const b = assetFilename(Buffer.from('hello'), 'png')
    expect(a).toBe(b)
    expect(a).toMatch(/^img-[0-9a-f]{8}\.png$/)
  })
  it('differs for different content', () => {
    expect(assetFilename(Buffer.from('a'), 'png')).not.toBe(
      assetFilename(Buffer.from('b'), 'png')
    )
  })
})

describe('validateDocxExt', () => {
  it('accepts .docx (any case)', () => {
    expect(() => validateDocxExt('/x/report.docx')).not.toThrow()
    expect(() => validateDocxExt('/x/Report.DOCX')).not.toThrow()
  })
  it('rejects legacy .doc with a clear message', () => {
    expect(() => validateDocxExt('/x/old.doc')).toThrow(/legacy \.doc/i)
  })
  it('rejects other extensions', () => {
    expect(() => validateDocxExt('/x/notes.txt')).toThrow(/Not a \.docx/)
  })
})

describe('htmlToMarkdown', () => {
  it('converts headings and emphasis', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toContain('# Title')
    expect(htmlToMarkdown('<strong>bold</strong>')).toContain('**bold**')
  })
  it('converts GFM tables', () => {
    const md = htmlToMarkdown(
      '<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>'
    )
    expect(md).toContain('| a | b |')
    expect(md).toContain('| 1 | 2 |')
  })
  it('preserves links', () => {
    expect(htmlToMarkdown('<a href="https://x.io">x</a>')).toContain('[x](https://x.io)')
  })
})
