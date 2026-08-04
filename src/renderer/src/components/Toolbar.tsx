/** Markdown formatting toolbar; each button applies a format to the editor. */
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  TextQuote,
  type LucideIcon
} from 'lucide-react'
import type { FormatKind } from './Editor.js'

interface ToolbarProps {
  onFormat: (kind: FormatKind) => void
}

/** Grouped by kind; `null` renders a divider. */
const GROUPS: Array<Array<[FormatKind, LucideIcon, string]>> = [
  [
    ['bold', Bold, 'Bold'],
    ['italic', Italic, 'Italic'],
    ['strike', Strikethrough, 'Strikethrough'],
    ['code', Code, 'Inline code']
  ],
  [
    ['h1', Heading1, 'Heading 1'],
    ['h2', Heading2, 'Heading 2'],
    ['quote', TextQuote, 'Blockquote'],
    ['ul', List, 'Bulleted list'],
    ['ol', ListOrdered, 'Numbered list']
  ],
  [['link', Link2, 'Link']]
]

export default function Toolbar({ onFormat }: ToolbarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5 border-b border-line bg-panel px-2 py-1">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1 h-4 w-px bg-line" />}
          {group.map(([kind, Icon, title]) => (
            <button key={kind} className="icon-btn" title={title} onClick={() => onFormat(kind)}>
              <Icon size={15} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
