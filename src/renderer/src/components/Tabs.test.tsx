// @vitest-environment jsdom
/** Tab strip rendering and interactions. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tabs from './Tabs.js'
import type { Buffer } from '../buffers.js'

afterEach(cleanup)

const buffers: Buffer[] = [
  { relPath: 'a.md', name: 'a.md', content: '', dirty: true },
  { relPath: 'sub/b.md', name: 'b.md', content: '', dirty: false }
]

describe('Tabs', () => {
  it('renders a tab per buffer', () => {
    render(<Tabs buffers={buffers} active={0} onActivate={() => {}} onClose={() => {}} />)
    expect(screen.getByText('a.md')).toBeTruthy()
    expect(screen.getByText('b.md')).toBeTruthy()
  })

  it('activates a tab on click', () => {
    const onActivate = vi.fn()
    render(<Tabs buffers={buffers} active={0} onActivate={onActivate} onClose={() => {}} />)
    fireEvent.click(screen.getByText('b.md'))
    expect(onActivate).toHaveBeenCalledWith('sub/b.md')
  })

  it('closes a tab via its close button', () => {
    const onClose = vi.fn()
    render(<Tabs buffers={buffers} active={0} onActivate={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close a.md'))
    expect(onClose).toHaveBeenCalledWith('a.md')
  })
})
