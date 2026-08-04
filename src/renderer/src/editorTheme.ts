/**
 * Turn a {@link ColorSet} + font settings into CodeMirror extensions.
 *
 * Derived colors (caret, selection, muted markup) are computed from the five
 * base colors via CSS `color-mix`, which Chromium (Electron's renderer)
 * supports — so a theme only ever specifies bg/fg/accent/heading.
 */
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { ColorSet } from './appearance.js'

/** Build the editor theme + Markdown syntax highlighting for a color set. */
export function buildEditorTheme(
  c: ColorSet,
  fontFamily: string,
  fontSize: number,
  lineHeight: number
): Extension[] {
  const caret = c.accent
  // Neutral selection tint (from text color, not the accent) so selecting text
  // doesn't wash the editor in the brand purple. Accent stays on caret/links.
  const selection = `color-mix(in srgb, ${c.fg} 18%, ${c.bg})`
  const muted = `color-mix(in srgb, ${c.fg} 55%, ${c.bg})`

  const theme = EditorView.theme(
    {
      '&': { backgroundColor: c.bg, color: c.fg, height: '100%' },
      '.cm-content': {
        fontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: String(lineHeight),
        caretColor: caret
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: caret },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: selection
      },
      '.cm-gutters': { backgroundColor: c.bg, color: muted, border: 'none' },
      '.cm-activeLine': { backgroundColor: 'transparent' }
    },
    { dark: c.dark }
  )

  const highlight = HighlightStyle.define([
    { tag: t.heading, color: c.heading, fontWeight: 'bold' },
    { tag: t.strong, color: c.heading, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: [t.link, t.url], color: c.accent, textDecoration: 'underline' },
    { tag: t.monospace, color: c.accent },
    { tag: t.list, color: c.accent },
    { tag: t.quote, color: muted, fontStyle: 'italic' },
    // Markdown markup punctuation (#, *, `, >) reads as de-emphasized.
    { tag: [t.meta, t.processingInstruction, t.punctuation], color: muted }
  ])

  return [theme, syntaxHighlighting(highlight)]
}
