// @vitest-environment jsdom
/** File-type icon selection by extension. */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import FileIcon from './FileIcon.js'

afterEach(cleanup)

describe('FileIcon', () => {
  it('renders the Markdown mark for .md files', () => {
    const { container } = render(<FileIcon name="note.md" />)
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 208 128')
  })

  it('renders an image icon for image files', () => {
    const { container } = render(<FileIcon name="pic.PNG" />)
    expect(container.querySelector('.lucide-image')).toBeTruthy()
  })

  it('falls back to a document icon otherwise', () => {
    const { container } = render(<FileIcon name="data.json" />)
    expect(container.querySelector('.lucide-file-text')).toBeTruthy()
  })
})
