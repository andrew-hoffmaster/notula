/** Markdown syntax cheatsheet modal (GFM, as rendered by the preview). */
import { X } from 'lucide-react'

interface HelpModalProps {
  onClose: () => void
}

/** [what it does, the Markdown you type]. */
const ROWS: Array<[string, string]> = [
  ['Heading 1–6', '# H1  ·  ## H2  ·  ### H3'],
  ['Bold', '**bold**'],
  ['Italic', '*italic*'],
  ['Bold + italic', '***both***'],
  ['Strikethrough', '~~struck~~'],
  ['Inline code', '`code`'],
  ['Code block', '```\ncode\n```'],
  ['Link', '[label](https://example.com)'],
  ['Image', '![alt](assets/pic.png)'],
  ['Bulleted list', '- item\n- item'],
  ['Numbered list', '1. item\n2. item'],
  ['Task list', '- [ ] todo\n- [x] done'],
  ['Blockquote', '> quoted'],
  ['Horizontal rule', '---'],
  ['Table', '| A | B |\n|---|---|\n| 1 | 2 |'],
  ['Nested list', '- item\n  - sub-item'],
  ['Mermaid diagram', '```mermaid\nflowchart LR\n  A --> B\n```']
]

export default function HelpModal({ onClose }: HelpModalProps): React.JSX.Element {
  return (
    <div className="backdrop flex items-center justify-center" onClick={onClose}>
      <div
        className="sheet max-h-[80vh] w-[34rem] overflow-auto p-5 text-sm text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Markdown reference</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close help">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <table className="w-full border-collapse">
          <tbody>
            {ROWS.map(([label, syntax]) => (
              <tr key={label} className="border-b border-line last:border-0">
                <td className="w-40 py-2 pr-3 align-top text-muted">{label}</td>
                <td className="py-2">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-ink">{syntax}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 leading-relaxed text-xs text-muted">
          Tip: paste or drag an image straight into the editor — it’s saved to{' '}
          <code className="rounded bg-hover px-1 text-ink">assets/</code> and linked automatically.
          Shortcuts: <Kbd>⌘/Ctrl</Kbd>
          <Kbd>N</Kbd> new note · <Kbd>⌘/Ctrl</Kbd>
          <Kbd>S</Kbd> save · <Kbd>⌘/Ctrl</Kbd>
          <Kbd>W</Kbd> close tab.
        </p>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="mx-0.5 rounded border border-line bg-hover px-1 font-sans text-[0.7rem] text-ink">
      {children}
    </kbd>
  )
}
