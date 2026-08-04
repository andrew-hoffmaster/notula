/**
 * CodeMirror 6 editing surface (design §5).
 *
 * CodeMirror owns the hard text-editing problems (IME, undo, large docs), so
 * this component is only glue: mount a view, push external content in, and
 * report edits out.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { buildEditorTheme } from '../editorTheme.js'
import type { ColorSet } from '../appearance.js'
import { csvToMarkdownTable, looksLikeTable } from '@shared/csv.js'

interface EditorProps {
  /** Stable identity of the open buffer; a change reloads the document. */
  docKey: string
  /** Initial document text for `docKey`. */
  value: string
  /** Fired on every user edit with the full new text. */
  onChange: (value: string) => void
  /** Fired on scroll with the top-visible 1-based source line, for preview sync. */
  onScroll?: (topLine: number) => void
  /** Fired when the cursor moves, with its 1-based source line. */
  onCursorLine?: (line: number) => void
  /**
   * Persist a pasted/dropped image and return its vault-relative path; the
   * editor then inserts a Markdown image reference at the cursor.
   */
  onSaveImage?: (bytes: ArrayBuffer, contentType: string) => Promise<string>
  /** Active color palette. */
  colors: ColorSet
  /** CSS font stack for the editor content. */
  fontFamily: string
  /** Editor font size in px. */
  fontSize: number
  /** Editor line height (unitless). */
  lineHeight: number
}

/** Markdown formatting actions the toolbar can trigger. */
export type FormatKind =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'h1'
  | 'h2'
  | 'quote'
  | 'ul'
  | 'ol'
  | 'link'

/** Imperative handle for driving the editor from outside (scroll, toolbar). */
export interface EditorHandle {
  /** Scroll so the given 1-based source line is at the top of the viewport. */
  scrollToLine(line: number): void
  /** Move the cursor to the start of the given 1-based line and focus. */
  setCursorLine(line: number): void
  /**
   * Select source lines `fromLine`..`toLine`. If the range is a single line and
   * `text` occurs in it, select that exact substring (word-level for plain
   * text); otherwise select the whole line span.
   */
  selectLines(fromLine: number, toLine: number, text?: string): void
  /** Apply a Markdown formatting action to the current selection. */
  format(kind: FormatKind): void
}

/** Inline markers that wrap the selection. */
const INLINE: Partial<Record<FormatKind, string>> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`'
}

/** Line prefixes prepended to each selected line. */
const LINE_PREFIX: Partial<Record<FormatKind, string>> = {
  h1: '# ',
  h2: '## ',
  quote: '> ',
  ul: '- ',
  ol: '1. '
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    docKey,
    value,
    onChange,
    onScroll,
    onCursorLine,
    onSaveImage,
    colors,
    fontFamily,
    fontSize,
    lineHeight
  },
  ref
) {
  // Signature of appearance inputs; drives an editor rebuild when they change.
  const themeKey = `${colors.bg}|${colors.fg}|${colors.accent}|${colors.heading}|${colors.dark}|${fontFamily}|${fontSize}|${lineHeight}`
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)

  /** Clamp a 1-based line number into the current document's range. */
  const clampLine = (v: EditorView, line: number): number =>
    Math.max(1, Math.min(Math.round(line), v.state.doc.lines))

  useImperativeHandle(ref, () => ({
    scrollToLine(line) {
      const v = view.current
      if (!v) return
      const pos = v.state.doc.line(clampLine(v, line)).from
      v.scrollDOM.scrollTop = v.lineBlockAt(pos).top
    },
    setCursorLine(line) {
      const v = view.current
      if (!v) return
      const pos = v.state.doc.line(clampLine(v, line)).from
      v.dispatch({ selection: { anchor: pos } })
      v.scrollDOM.scrollTop = v.lineBlockAt(pos).top
      v.focus()
    },
    selectLines(fromLine, toLine, text) {
      const v = view.current
      if (!v) return
      const a = v.state.doc.line(clampLine(v, fromLine))
      const b = v.state.doc.line(clampLine(v, toLine))
      let from = a.from
      let to = b.to
      // Refine to the exact substring when it's a single line and unambiguous.
      if (a.number === b.number && text) {
        const idx = a.text.indexOf(text)
        if (idx >= 0) {
          from = a.from + idx
          to = from + text.length
        }
      }
      v.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true })
      v.focus()
    },
    format(kind) {
      const v = view.current
      if (!v) return
      const { from, to } = v.state.selection.main

      const marker = INLINE[kind]
      if (marker) {
        const sel = v.state.sliceDoc(from, to)
        v.dispatch({
          changes: { from, to, insert: marker + sel + marker },
          selection: { anchor: from + marker.length, head: from + marker.length + sel.length }
        })
        v.focus()
        return
      }

      const prefix = LINE_PREFIX[kind]
      if (prefix) {
        const first = v.state.doc.lineAt(from).number
        const last = v.state.doc.lineAt(to).number
        const changes = []
        for (let n = first; n <= last; n++) {
          changes.push({ from: v.state.doc.line(n).from, insert: prefix })
        }
        v.dispatch({ changes })
        v.focus()
        return
      }

      if (kind === 'link') {
        const text = v.state.sliceDoc(from, to)
        const insert = `[${text}](url)`
        const urlStart = from + text.length + 3 // after "[text]("
        v.dispatch({
          changes: { from, to, insert },
          selection: { anchor: urlStart, head: urlStart + 3 }
        })
        v.focus()
      }
    }
  }), [])
  // Keep the latest callbacks without re-creating the editor on every render.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onScrollRef = useRef(onScroll)
  onScrollRef.current = onScroll
  const onCursorLineRef = useRef(onCursorLine)
  onCursorLineRef.current = onCursorLine
  const onSaveImageRef = useRef(onSaveImage)
  onSaveImageRef.current = onSaveImage

  // Save an image and insert a Markdown reference to it at the cursor.
  const insertImage = async (view: EditorView, file: File): Promise<void> => {
    const save = onSaveImageRef.current
    if (!save) return
    const pos = view.state.selection.main.head
    const rel = await save(await file.arrayBuffer(), file.type)
    const text = `![](${rel})`
    // The doc change fires the update listener, which propagates onChange.
    view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } })
  }

  // Recreate the editor state whenever the active buffer changes. Keying on
  // `docKey` (not `value`) avoids clobbering the cursor while typing.
  useEffect(() => {
    if (!host.current) return
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        EditorView.lineWrapping,
        // Opt the editing surface into Electron's native spellchecker.
        EditorView.contentAttributes.of({
          spellcheck: 'true',
          autocapitalize: 'off',
          autocorrect: 'off'
        }),
        // ponytail: rebuild the editor when appearance changes (via the effect
        // dep) rather than a reconfigure Compartment — changes are rare and this
        // is less code; add a Compartment if losing cursor/undo on change annoys.
        ...buildEditorTheme(colors, fontFamily, fontSize, lineHeight),
        // Paste or drop an image → save it to the vault and insert a reference.
        EditorView.domEventHandlers({
          paste(event, view) {
            for (const item of event.clipboardData?.items ?? []) {
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile()
                if (file) {
                  event.preventDefault()
                  void insertImage(view, file)
                  return true
                }
              }
            }
            // Tabular clipboard text (spreadsheet copy, CSV) → Markdown table.
            const text = event.clipboardData?.getData('text/plain') ?? ''
            if (text && looksLikeTable(text)) {
              event.preventDefault()
              const table = csvToMarkdownTable(text)
              const { from, to } = view.state.selection.main
              view.dispatch({
                changes: { from, to, insert: table },
                selection: { anchor: from + table.length }
              })
              return true
            }
            return false
          },
          drop(event, view) {
            const images = [...(event.dataTransfer?.files ?? [])].filter((f) =>
              f.type.startsWith('image/')
            )
            if (images.length === 0) return false
            event.preventDefault()
            images.forEach((f) => void insertImage(view, f))
            return true
          }
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString())
          if (u.docChanged || u.selectionSet) {
            const line = u.state.doc.lineAt(u.state.selection.main.head).number
            onCursorLineRef.current?.(line)
          }
        })
      ]
    })
    const v = new EditorView({ state, parent: host.current })
    view.current = v

    // Report the top-visible source line for line-mapped preview sync (§5):
    // the preview aligns the matching data-source-line block to its top.
    const scroller = v.scrollDOM
    const onScrollDom = () => {
      const rect = scroller.getBoundingClientRect()
      const pos = v.posAtCoords({ x: rect.left + 4, y: rect.top + 2 })
      onScrollRef.current?.(pos == null ? 1 : v.state.doc.lineAt(pos).number)
    }
    scroller.addEventListener('scroll', onScrollDom)

    return () => {
      scroller.removeEventListener('scroll', onScrollDom)
      v.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, themeKey])

  return <div ref={host} className="h-full overflow-auto text-sm" />
})

export default Editor
