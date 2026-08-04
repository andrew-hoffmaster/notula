/** Tests for the sanitized Markdown preview pipeline. */
import { describe, expect, it } from 'vitest'
import { renderMarkdown, resolveImageSrc } from './markdown.js'

describe('renderMarkdown', () => {
  it('renders basic Markdown to HTML', () => {
    expect(renderMarkdown('# Hello')).toMatch(/<h1[^>]*>Hello<\/h1>/)
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>')
  })

  it('supports GFM tables', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table')
    expect(html).toContain('<td>1</td>')
  })

  it('supports GFM task lists and strikethrough', () => {
    expect(renderMarkdown('- [x] done')).toContain('type="checkbox"')
    expect(renderMarkdown('~~gone~~')).toContain('<del>gone</del>')
  })

  it('strips script tags (XSS defense)', () => {
    const html = renderMarkdown('hi <script>alert(1)</script> there')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('alert(1)')
  })

  it('strips inline event handlers and javascript: URLs', () => {
    const imgHtml = renderMarkdown('<img src=x onerror="alert(1)">')
    expect(imgHtml).not.toContain('onerror')
    const linkHtml = renderMarkdown('[x](javascript:alert(1))')
    expect(linkHtml).not.toContain('javascript:')
  })

  it('keeps safe inline HTML', () => {
    expect(renderMarkdown('a <em>b</em> c')).toContain('<em>b</em>')
  })

  it('rewrites relative image paths to the vault image scheme', () => {
    expect(renderMarkdown('![](assets/x.png)')).toContain('notula-img://vault/assets/x.png')
  })

  it('resolves images relative to the note directory', () => {
    expect(renderMarkdown('![](pic.png)', 'projects')).toContain(
      'notula-img://vault/projects/pic.png'
    )
  })

  it('leaves external image URLs untouched', () => {
    const html = renderMarkdown('![](https://example.com/x.png)')
    expect(html).toContain('https://example.com/x.png')
    expect(html).not.toContain('notula-img')
  })

  it('stamps top-level blocks with their source line', () => {
    const html = renderMarkdown('# Title\n\nA paragraph\n\nAnother')
    expect(html).toContain('data-source-line="1"') // heading on line 1
    expect(html).toContain('data-source-line="3"') // first paragraph on line 3
    expect(html).toContain('data-source-line="5"') // second paragraph on line 5
  })
})

describe('resolveImageSrc', () => {
  it('resolves relative to the note directory', () => {
    expect(resolveImageSrc('projects', 'img/a.png')).toBe('projects/img/a.png')
    expect(resolveImageSrc('', 'assets/a.png')).toBe('assets/a.png')
  })
  it('collapses . and .. segments within the vault', () => {
    expect(resolveImageSrc('projects/sub', '../a.png')).toBe('projects/a.png')
    expect(resolveImageSrc('projects', './a.png')).toBe('projects/a.png')
  })
  it('returns null for external URLs and data URIs', () => {
    expect(resolveImageSrc('', 'https://x.io/a.png')).toBeNull()
    expect(resolveImageSrc('', 'data:image/png;base64,AAAA')).toBeNull()
  })
  it('returns null when the path escapes the vault', () => {
    expect(resolveImageSrc('projects', '../../etc/passwd')).toBeNull()
  })
})
