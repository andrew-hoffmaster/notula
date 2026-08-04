/** Minimal right-click context menu positioned at a screen coordinate. */

export interface MenuItem {
  label: string
  /** Renders the item in red for destructive actions. */
  danger?: boolean
  action: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps): React.JSX.Element {
  return (
    // Full-screen backdrop closes the menu on any outside click.
    <div
      className="fixed inset-0 z-[var(--z-dropdown)]"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ul
        className="absolute min-w-40 overflow-hidden rounded-lg border border-line bg-elevated py-1 text-[13px] shadow-[0_8px_28px_-8px_rgb(0_0_0/0.35)]"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <li key={item.label}>
            <button
              className={`block w-full px-3 py-1.5 text-left transition-colors hover:bg-hover ${
                item.danger ? 'text-red-500 hover:text-red-500' : 'text-ink'
              }`}
              onClick={() => {
                item.action()
                onClose()
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
