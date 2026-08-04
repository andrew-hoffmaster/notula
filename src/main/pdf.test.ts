/** Tests for the PDF print-HTML wrapper. */
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPrintHtml } from './pdf.js'

describe('buildPrintHtml', () => {
  const root = path.resolve('/vault')

  it('embeds the body inside a full HTML document', () => {
    const html = buildPrintHtml('<h1>Hi</h1>', root)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<h1>Hi</h1>')
    expect(html).toContain('<div class="content">')
  })

  it('includes print CSS that avoids breaking code/tables across pages', () => {
    const html = buildPrintHtml('', root)
    expect(html).toMatch(/pre, table, blockquote[^}]*break-inside: avoid/)
  })

  it('sets a file:// base href so relative image paths resolve to the vault', () => {
    const html = buildPrintHtml('<img src="assets/x.png">', root)
    expect(html).toMatch(/<base href="file:\/\/[^"]+\/">/)
  })
})
