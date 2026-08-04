/** Modal wrapper showing a single file's diff. */
import { X } from 'lucide-react'
import DiffView from './DiffView.js'

interface DiffModalProps {
  title: string
  diff: string
  onClose: () => void
}

export default function DiffModal({ title, diff, onClose }: DiffModalProps): React.JSX.Element {
  return (
    <div className="backdrop flex items-center justify-center" onClick={onClose}>
      <div
        className="sheet flex max-h-[85vh] w-[46rem] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="truncate font-mono text-[13px] text-ink">{title}</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close diff">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto py-2">
          <DiffView diff={diff} />
        </div>
      </div>
    </div>
  )
}
