/** Per-file commit history with an inline diff for the selected commit. */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { GitCommit } from '@shared/git.js'
import DiffView from './DiffView.js'

interface HistoryModalProps {
  path: string
  onClose: () => void
}

export default function HistoryModal({ path, onClose }: HistoryModalProps): React.JSX.Element {
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [diff, setDiff] = useState('')

  useEffect(() => {
    window.api.git.log(path).then(setCommits)
  }, [path])

  useEffect(() => {
    if (selected) window.api.git.diff(path, { commit: selected }).then(setDiff)
  }, [path, selected])

  return (
    <div className="backdrop flex items-center justify-center" onClick={onClose}>
      <div
        className="sheet flex h-[80vh] w-[52rem] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="truncate text-[13px] text-ink">
            History · <span className="font-mono">{path}</span>
          </h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close history">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <ul className="w-64 shrink-0 overflow-auto border-r border-line py-1">
            {commits.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">No commits yet.</li>
            )}
            {commits.map((c) => (
              <li key={c.hash}>
                <button
                  data-active={c.hash === selected}
                  onClick={() => setSelected(c.hash)}
                  className="row block w-full px-3 py-2 text-left"
                >
                  <span className="block truncate text-[13px] text-ink">{c.message}</span>
                  <span className="mt-0.5 block truncate text-xs text-faint">
                    <span className="font-mono">{c.shortHash}</span> · {c.author} · {c.date.slice(0, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="min-w-0 flex-1 overflow-auto py-2">
            {selected ? (
              <DiffView diff={diff} />
            ) : (
              <p className="p-4 text-sm text-muted">Select a commit to see its changes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
