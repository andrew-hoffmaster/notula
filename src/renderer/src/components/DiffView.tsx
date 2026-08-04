/** Renders a unified diff string with per-line colouring. */
import { parseDiff } from '@shared/git.js'

interface DiffViewProps {
  diff: string
}

const LINE_CLASS: Record<string, string> = {
  add: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  del: 'bg-red-500/10 text-red-700 dark:text-red-300',
  hunk: 'text-accent',
  meta: 'text-faint',
  context: 'text-ink'
}

const PREFIX: Record<string, string> = { add: '+', del: '-', context: ' ', hunk: '', meta: '' }

export default function DiffView({ diff }: DiffViewProps): React.JSX.Element {
  const lines = parseDiff(diff)
  if (lines.length === 0) {
    return <p className="p-4 text-sm text-muted">No changes.</p>
  }
  return (
    <pre className="overflow-auto font-mono text-xs leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className={`px-3 ${LINE_CLASS[line.type]}`}>
          <span className="select-none opacity-50">{PREFIX[line.type]}</span>
          {line.text || ' '}
        </div>
      ))}
    </pre>
  )
}
