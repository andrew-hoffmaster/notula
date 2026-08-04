// @vitest-environment jsdom
/** File tree rendering, expand/collapse, open, and favorite interactions. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import FileTree from './FileTree.js'
import type { FileNode } from '@shared/types.js'

afterEach(cleanup)

const nodes: FileNode[] = [
  {
    relPath: 'projects',
    name: 'projects',
    isDir: true,
    children: [{ relPath: 'projects/x.md', name: 'x.md', isDir: false }]
  },
  { relPath: 'note.md', name: 'note.md', isDir: false }
]

const props = {
  nodes,
  activePath: null,
  expanded: new Set<string>(),
  favorites: new Set<string>(),
  onOpen: vi.fn(),
  onToggleExpand: vi.fn(),
  onToggleFavorite: vi.fn(),
  onContextMenu: vi.fn()
}

describe('FileTree', () => {
  it('hides folder children until expanded', () => {
    const { rerender } = render(<FileTree {...props} />)
    expect(screen.queryByText('x.md')).toBeNull()
    rerender(<FileTree {...props} expanded={new Set(['projects'])} />)
    expect(screen.getByText('x.md')).toBeTruthy()
  })

  it('toggles a folder on click', () => {
    const onToggleExpand = vi.fn()
    render(<FileTree {...props} onToggleExpand={onToggleExpand} />)
    fireEvent.click(screen.getByText('projects'))
    expect(onToggleExpand).toHaveBeenCalledWith('projects')
  })

  it('opens a file on click', () => {
    const onOpen = vi.fn()
    render(<FileTree {...props} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('note.md'))
    expect(onOpen).toHaveBeenCalledWith('note.md')
  })

  it('stars a file via its star button', () => {
    const onToggleFavorite = vi.fn()
    render(<FileTree {...props} onToggleFavorite={onToggleFavorite} />)
    fireEvent.click(screen.getByLabelText('Star note.md'))
    expect(onToggleFavorite).toHaveBeenCalledWith('note.md')
  })
})
