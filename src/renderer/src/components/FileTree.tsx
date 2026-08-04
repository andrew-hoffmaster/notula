/**
 * Recursive, collapsible vault file tree (VS Code style): folders expand and
 * collapse via a chevron; files can be starred as favorites.
 */
import { ChevronRight, Star } from 'lucide-react'
import type { FileNode } from '@shared/types.js'
import type { ChangeClass } from '@shared/git.js'
import FileIcon from './FileIcon.js'

/** Badge colour per git change kind. */
const GIT_COLOR: Record<string, string> = {
  modified: 'text-amber-500',
  added: 'text-emerald-500',
  untracked: 'text-emerald-500',
  deleted: 'text-red-500',
  renamed: 'text-blue-500',
  conflict: 'text-red-500'
}

interface FileTreeProps {
  nodes: FileNode[]
  /** Currently open file, for highlighting. */
  activePath: string | null
  /** Relative paths of expanded folders. */
  expanded: Set<string>
  /** Relative paths of favorited files. */
  favorites: Set<string>
  /** Open a Markdown file by vault-relative path. */
  onOpen: (relPath: string) => void
  /** Expand/collapse a folder by vault-relative path. */
  onToggleExpand: (relPath: string) => void
  /** Star/unstar a file by vault-relative path. */
  onToggleFavorite: (relPath: string) => void
  /** Right-click a node: show a context menu at the pointer. */
  onContextMenu: (node: FileNode, x: number, y: number) => void
  /** Git change class per vault-relative path (badges). */
  gitBadges?: Map<string, ChangeClass>
}

export default function FileTree(props: FileTreeProps): React.JSX.Element {
  return <div className="py-1">{props.nodes.map((n) => renderNode(n, 0, props))}</div>
}

/** Render one node (and its subtree) at the given indent depth. */
function renderNode(node: FileNode, depth: number, props: FileTreeProps): React.JSX.Element {
  const indent = { paddingLeft: `${depth * 12 + 8}px` }
  const onContext = (e: React.MouseEvent) => {
    e.preventDefault()
    props.onContextMenu(node, e.clientX, e.clientY)
  }

  if (node.isDir) {
    const open = props.expanded.has(node.relPath)
    return (
      <div key={node.relPath}>
        <button
          className="row rounded-none py-1 text-[13px] font-medium"
          style={indent}
          onClick={() => props.onToggleExpand(node.relPath)}
          onContextMenu={onContext}
        >
          <ChevronRight
            size={14}
            strokeWidth={2}
            className={`mr-1 shrink-0 text-faint transition-transform duration-150 ${
              open ? 'rotate-90' : ''
            }`}
          />
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map((child) => renderNode(child, depth + 1, props))}
      </div>
    )
  }

  const active = node.relPath === props.activePath
  const fav = props.favorites.has(node.relPath)
  const badge = props.gitBadges?.get(node.relPath)
  return (
    <div key={node.relPath} data-active={active} className="row group" onContextMenu={onContext}>
      <button
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left text-[13px]"
        style={indent}
        onClick={() => props.onOpen(node.relPath)}
      >
        <FileIcon name={node.name} className="shrink-0 text-faint" />
        <span className={`truncate ${badge ? GIT_COLOR[badge.kind] : ''}`}>{node.name}</span>
      </button>
      {badge && (
        <span className={`w-4 shrink-0 text-center text-xs font-semibold ${GIT_COLOR[badge.kind]}`}>
          {badge.letter}
        </span>
      )}
      <button
        className={`mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded transition ${
          fav
            ? 'text-accent'
            : 'text-faint opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover:opacity-100'
        }`}
        aria-label={fav ? `Unstar ${node.name}` : `Star ${node.name}`}
        onClick={() => props.onToggleFavorite(node.relPath)}
      >
        <Star size={13} strokeWidth={2} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
