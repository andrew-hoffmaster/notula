/**
 * Vertical activity bar (VS Code style): switches the sidebar view and holds
 * the app-level actions (help, settings) at the bottom.
 */
import { Files, GitBranch, HelpCircle, Settings } from 'lucide-react'

export type SidebarView = 'files' | 'scm'

interface ActivityBarProps {
  view: SidebarView
  onView: (view: SidebarView) => void
  /** Number of git changes, shown as a badge on the Source Control item. */
  gitChanges: number
  onHelp: () => void
  onSettings: () => void
}

export default function ActivityBar({
  view,
  onView,
  gitChanges,
  onHelp,
  onSettings
}: ActivityBarProps): React.JSX.Element {
  return (
    <div className="flex w-12 shrink-0 flex-col border-r border-line bg-panel">
      <Item title="Files" active={view === 'files'} onClick={() => onView('files')}>
        <Files size={20} strokeWidth={1.5} />
      </Item>
      <Item
        title="Source Control"
        active={view === 'scm'}
        badge={gitChanges}
        onClick={() => onView('scm')}
      >
        <GitBranch size={20} strokeWidth={1.5} />
      </Item>

      <div className="flex-1" />

      <Item title="Markdown help" onClick={onHelp}>
        <HelpCircle size={20} strokeWidth={1.5} />
      </Item>
      <Item title="Appearance settings" onClick={onSettings}>
        <Settings size={20} strokeWidth={1.5} />
      </Item>
    </div>
  )
}

function Item({
  title,
  active = false,
  badge = 0,
  onClick,
  children
}: {
  title: string
  active?: boolean
  badge?: number
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`relative flex h-12 w-full items-center justify-center transition-colors ${
        active ? 'text-ink' : 'text-faint hover:text-ink'
      }`}
    >
      {active && <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full bg-accent" />}
      {children}
      {badge > 0 && (
        <span className="absolute right-1.5 top-2 min-w-4 rounded-full bg-accent px-1 text-center text-[9px] font-semibold leading-4 text-accent-fg">
          {badge}
        </span>
      )}
    </button>
  )
}
