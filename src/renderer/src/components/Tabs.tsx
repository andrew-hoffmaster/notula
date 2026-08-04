/** Open-buffer tab strip (design §9 tabs decision). */
import { X } from 'lucide-react'
import type { Buffer } from '../buffers.js'

interface TabsProps {
  buffers: Buffer[]
  active: number
  onActivate: (relPath: string) => void
  onClose: (relPath: string) => void
}

export default function Tabs({ buffers, active, onActivate, onClose }: TabsProps): React.JSX.Element {
  return (
    <div className="flex h-9 items-stretch overflow-x-auto">
      {buffers.map((b, i) => {
        const isActive = i === active
        return (
          <div
            key={b.relPath}
            data-active={isActive}
            className="group relative flex max-w-[13rem] items-center gap-1.5 border-r border-line px-3 text-[13px] text-muted data-[active=true]:bg-app data-[active=true]:text-ink"
          >
            {/* Accent seam marking the active tab. */}
            {isActive && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" />}

            <button
              onClick={() => onActivate(b.relPath)}
              className="truncate outline-none"
              title={b.relPath}
            >
              {b.name}
            </button>

            {/* Dirty dot until hovered, then a close affordance in its place. */}
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
              {b.dirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 transition-opacity group-hover:opacity-0" />
              )}
              <button
                onClick={() => onClose(b.relPath)}
                aria-label={`Close ${b.name}`}
                className="absolute inset-0 flex items-center justify-center rounded opacity-0 transition hover:bg-hover hover:text-ink group-hover:opacity-100"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
