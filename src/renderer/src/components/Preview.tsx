/**
 * Live preview pane (design §5): renders sanitized HTML from the pipeline,
 * debounced ~100ms so fast typing doesn't re-render on every keystroke.
 *
 * Blocks carry `data-source-line` (added in the markdown pipeline), enabling
 * line-mapped scroll sync, active-block highlighting, and click-to-jump.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import { renderMarkdown } from '../markdown.js'
import { csvToMarkdownTable } from '@shared/csv.js'

/** Monotonic id source for mermaid render targets. */
let mermaidSeq = 0

/**
 * Render any ```mermaid code blocks inside `root` into SVG diagrams. Loaded
 * lazily so the (large) mermaid library only ships when a diagram is present.
 */
async function renderMermaid(root: HTMLElement, dark: boolean, cancelled: () => boolean): Promise<void> {
  const blocks = root.querySelectorAll<HTMLElement>('code.language-mermaid')
  if (blocks.length === 0) return
  const mermaid = (await import('mermaid')).default
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'neutral' })

  for (const code of blocks) {
    if (cancelled()) return
    const pre = code.closest('pre') ?? code
    const source = code.textContent ?? ''
    try {
      const { svg } = await mermaid.render(`mmd-${mermaidSeq++}`, source)
      if (cancelled()) return
      const wrap = document.createElement('div')
      wrap.className = 'mermaid-diagram my-4 flex justify-center'
      if (pre instanceof HTMLElement && pre.dataset.sourceLine) {
        wrap.dataset.sourceLine = pre.dataset.sourceLine
      }
      wrap.innerHTML = svg
      pre.replaceWith(wrap)
    } catch (err) {
      const box = document.createElement('pre')
      box.className = 'mermaid-error'
      box.textContent = `Mermaid error: ${err instanceof Error ? err.message : String(err)}`
      pre.replaceWith(box)
    }
  }
}

/** Debounce delay before re-rendering the preview (design §5: ~100ms). */
const RENDER_MS = 100

/** Imperative handle so the editor can align the preview to a source line. */
export interface PreviewHandle {
  /** Scroll so the block for the given 1-based source line is at the top. */
  scrollToLine(line: number): void
}

interface PreviewProps {
  /** Current Markdown source. */
  value: string
  /** Vault-relative directory of the note, for resolving relative images. */
  baseDir: string
  /** Editor theme background, so the preview shares the writing surface. */
  background: string
  /** Render the source as a CSV/TSV table rather than Markdown. */
  asCsv?: boolean
  /** Dark theme active (for mermaid diagram theming). */
  dark: boolean
  /** Source line of the editor cursor; its block is highlighted. */
  activeLine: number
  /** Fired on scroll with the top-visible block's source line. */
  onScrollLine: (line: number) => void
  /** Fired when a block is clicked (collapsed selection), with its source line. */
  onSelectLine: (line: number) => void
  /**
   * Fired when text is selected across blocks, with the covered source-line
   * span and the selected text (for exact single-line matching).
   */
  onSelectRange: (fromLine: number, toLine: number, text: string) => void
}

const Preview = forwardRef<PreviewHandle, PreviewProps>(function Preview(
  { value, baseDir, background, asCsv, dark, activeLine, onScrollLine, onSelectLine, onSelectRange },
  ref
) {
  const el = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState('')
  // Latest callbacks, so the scroll/selection listeners attach once.
  const onScrollLineRef = useRef(onScrollLine)
  onScrollLineRef.current = onScrollLine
  const onSelectLineRef = useRef(onSelectLine)
  onSelectLineRef.current = onSelectLine
  const onSelectRangeRef = useRef(onSelectRange)
  onSelectRangeRef.current = onSelectRange

  const blocks = (): HTMLElement[] =>
    el.current ? [...el.current.querySelectorAll<HTMLElement>('[data-source-line]')] : []

  /** The block whose source line is the greatest ≤ `line`. */
  const blockForLine = (line: number): HTMLElement | undefined => {
    let match: HTMLElement | undefined
    for (const b of blocks()) {
      if (Number(b.dataset.sourceLine) <= line) match = b
      else break
    }
    return match
  }

  useImperativeHandle(ref, () => ({
    scrollToLine(line) {
      const container = el.current
      const target = blockForLine(line)
      if (!container || !target) return
      container.scrollTop +=
        target.getBoundingClientRect().top - container.getBoundingClientRect().top
    }
  }), [])

  // Debounced render. CSV/TSV files are shown as a rendered table.
  useEffect(() => {
    const source = asCsv ? csvToMarkdownTable(value) : value
    const t = setTimeout(() => setHtml(renderMarkdown(source, baseDir)), RENDER_MS)
    return () => clearTimeout(t)
  }, [value, baseDir, asCsv])

  // Render mermaid code blocks into diagrams after the HTML updates.
  useEffect(() => {
    const root = el.current
    if (!root) return
    let cancelled = false
    void renderMermaid(root, dark, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [html, dark])

  // Highlight the block matching the editor cursor whenever it moves or the
  // rendered HTML changes.
  useEffect(() => {
    for (const b of blocks()) b.classList.remove('src-active')
    blockForLine(activeLine)?.classList.add('src-active')
  }, [html, activeLine])

  // Attach scroll + click listeners once; they read the latest callbacks.
  useEffect(() => {
    const container = el.current
    if (!container) return
    const onScroll = () => {
      const top = container.getBoundingClientRect().top
      let line = 1
      for (const b of blocks()) {
        if (b.getBoundingClientRect().top - top <= 1) line = Number(b.dataset.sourceLine)
        else break
      }
      onScrollLineRef.current(line)
    }
    // Mouse-up ends a click or a drag-select. A collapsed selection jumps the
    // editor cursor to the block; a range selects the covered source lines.
    const blockOf = (node: Node | null): HTMLElement | null => {
      const start = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
      return start?.closest<HTMLElement>('[data-source-line]') ?? null
    }
    const onMouseUp = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || !container.contains(sel.anchorNode)) return
      if (sel.isCollapsed) {
        const block = blockOf(sel.anchorNode)
        if (block) onSelectLineRef.current(Number(block.dataset.sourceLine))
        return
      }
      const a = blockOf(sel.anchorNode)
      const b = blockOf(sel.focusNode)
      if (a && b) {
        const l1 = Number(a.dataset.sourceLine)
        const l2 = Number(b.dataset.sourceLine)
        onSelectRangeRef.current(Math.min(l1, l2), Math.max(l1, l2), sel.toString())
      }
    }
    container.addEventListener('scroll', onScroll)
    container.addEventListener('mouseup', onMouseUp)
    return () => {
      container.removeEventListener('scroll', onScroll)
      container.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div
      ref={el}
      style={{ background }}
      className="prose prose-neutral h-full max-w-none overflow-auto px-8 py-6 dark:prose-invert"
      // Safe: `html` is sanitized by rehype-sanitize in renderMarkdown (§3).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

export default Preview
