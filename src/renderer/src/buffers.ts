/**
 * Multi-buffer (tabbed) editor state as a pure reducer.
 *
 * The design chose tabs over a single document (§9). Keeping the tab logic —
 * open/dedup/activate/edit/save/close — as a pure function makes it unit
 * testable without a DOM and keeps the React component thin.
 */

/** One open file. */
export interface Buffer {
  /** Vault-relative path; unique identity of the buffer. */
  relPath: string
  /** Basename, for the tab label. */
  name: string
  /** In-memory contents (may differ from disk while dirty). */
  content: string
  /** True when `content` has unsaved edits. */
  dirty: boolean
}

/** The full tabbed-editor state. */
export interface BuffersState {
  buffers: Buffer[]
  /** Index into `buffers`, or -1 when none are open. */
  active: number
}

export type BuffersAction =
  /** File loaded from disk: open a new tab or focus the existing one. */
  | { type: 'open'; relPath: string; name: string; content: string }
  /** User edited the active buffer. */
  | { type: 'edit'; relPath: string; content: string }
  /** A buffer was persisted to disk. */
  | { type: 'saved'; relPath: string }
  /** Replace a buffer's content from disk (external change) and mark it clean. */
  | { type: 'reload'; relPath: string; content: string }
  /** A file was renamed on disk: update the matching buffer's identity. */
  | { type: 'rename'; from: string; to: string; name: string }
  /** Close a tab by path. */
  | { type: 'close'; relPath: string }
  /** Focus a tab by path. */
  | { type: 'activate'; relPath: string }
  /** Close everything (e.g. when switching vaults). */
  | { type: 'reset' }

export const initialBuffersState: BuffersState = { buffers: [], active: -1 }

export function buffersReducer(state: BuffersState, action: BuffersAction): BuffersState {
  switch (action.type) {
    case 'open': {
      const existing = state.buffers.findIndex((b) => b.relPath === action.relPath)
      if (existing !== -1) return { ...state, active: existing }
      const buffers = [
        ...state.buffers,
        { relPath: action.relPath, name: action.name, content: action.content, dirty: false }
      ]
      return { buffers, active: buffers.length - 1 }
    }

    case 'edit':
      return {
        ...state,
        buffers: state.buffers.map((b) =>
          b.relPath === action.relPath ? { ...b, content: action.content, dirty: true } : b
        )
      }

    case 'saved':
      return {
        ...state,
        buffers: state.buffers.map((b) =>
          b.relPath === action.relPath ? { ...b, dirty: false } : b
        )
      }

    case 'reload':
      return {
        ...state,
        buffers: state.buffers.map((b) =>
          b.relPath === action.relPath ? { ...b, content: action.content, dirty: false } : b
        )
      }

    case 'rename':
      return {
        ...state,
        buffers: state.buffers.map((b) =>
          b.relPath === action.from ? { ...b, relPath: action.to, name: action.name } : b
        )
      }

    case 'activate': {
      const idx = state.buffers.findIndex((b) => b.relPath === action.relPath)
      return idx === -1 ? state : { ...state, active: idx }
    }

    case 'reset':
      return initialBuffersState

    case 'close': {
      const idx = state.buffers.findIndex((b) => b.relPath === action.relPath)
      if (idx === -1) return state
      const buffers = state.buffers.filter((_, i) => i !== idx)
      // Keep focus stable: shift left when closing at/left of the active tab.
      let active = state.active
      if (idx < active || active >= buffers.length) active -= 1
      return { buffers, active: Math.max(active, buffers.length ? 0 : -1) }
    }

    default:
      return state
  }
}

/** The currently focused buffer, or null when none is open. */
export function activeBuffer(state: BuffersState): Buffer | null {
  return state.active >= 0 ? state.buffers[state.active] ?? null : null
}

/** How to react when an open file changed on disk. */
export type ExternalChange = 'reload' | 'ignore' | 'conflict'

/**
 * External-change policy for an open buffer whose file changed on disk
 * (design §4):
 *
 * | Buffer state             | Action  |
 * | ------------------------ | ------- |
 * | Clean                    | reload  |
 * | Dirty, identical to disk | ignore  |
 * | Dirty, differs from disk | conflict|
 */
export function resolveExternalChange(buffer: Buffer, diskContent: string): ExternalChange {
  if (!buffer.dirty) return 'reload'
  return buffer.content === diskContent ? 'ignore' : 'conflict'
}
