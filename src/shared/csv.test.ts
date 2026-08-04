/** Tests for the CSV/TSV ↔ Markdown table converter. */
import { describe, expect, it } from 'vitest'
import { csvToMarkdownTable, detectDelimiter, looksLikeTable, parseCsv } from './csv.js'

describe('detectDelimiter', () => {
  it('detects comma by default', () => {
    expect(detectDelimiter('a,b,c')).toBe(',')
  })
  it('detects tab when tabs dominate the first line', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t')
  })
})

describe('parseCsv', () => {
  it('parses a simple grid', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2']
    ])
  })

  it('handles quoted fields with commas and newlines', () => {
    expect(parseCsv('name,note\n"Ana, B","line1\nline2"')).toEqual([
      ['name', 'note'],
      ['Ana, B', 'line1\nline2']
    ])
  })

  it('unescapes doubled quotes', () => {
    expect(parseCsv('x\n"she said ""hi"""')).toEqual([['x'], ['she said "hi"']])
  })

  it('handles CRLF line endings and a trailing newline', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2']
    ])
  })

  it('parses TSV', () => {
    expect(parseCsv('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2']
    ])
  })
})

describe('csvToMarkdownTable', () => {
  it('builds a GFM table with a header row', () => {
    expect(csvToMarkdownTable('name,role\nAna,Dev\nBo,Design')).toBe(
      '| name | role |\n| --- | --- |\n| Ana | Dev |\n| Bo | Design |\n'
    )
  })

  it('escapes pipes in cells', () => {
    expect(csvToMarkdownTable('a\nx|y')).toContain('x\\|y')
  })

  it('pads ragged rows to the widest row', () => {
    const md = csvToMarkdownTable('a,b,c\n1,2')
    expect(md).toContain('| 1 | 2 |  |')
  })

  it('returns empty string for empty input', () => {
    expect(csvToMarkdownTable('')).toBe('')
  })
})

describe('looksLikeTable', () => {
  it('accepts consistent multi-column, multi-row text', () => {
    expect(looksLikeTable('a,b,c\n1,2,3\n4,5,6')).toBe(true)
    expect(looksLikeTable('a\tb\n1\t2')).toBe(true)
  })
  it('rejects a single line', () => {
    expect(looksLikeTable('a,b,c')).toBe(false)
  })
  it('rejects prose with inconsistent commas', () => {
    expect(looksLikeTable('Hello, world.\nThis is a sentence, really.')).toBe(false)
  })
  it('rejects single-column text', () => {
    expect(looksLikeTable('one\ntwo\nthree')).toBe(false)
  })
  it('does not auto-convert two-column comma data (too prose-like)', () => {
    expect(looksLikeTable('name,role\nAna,Dev')).toBe(false)
  })
})
