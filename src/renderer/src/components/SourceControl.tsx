/**
 * Source Control panel: branch, sync, commit, and staged/unstaged change lists
 * with stage / unstage / discard, plus a diff-on-click. Reads from git status
 * and calls the git API, refreshing after each action.
 */
import { useState } from 'react'
import {
  ArrowDownUp,
  Check,
  GitBranch,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw
} from 'lucide-react'
import {
  classify,
  isStaged,
  isUnstaged,
  type GitFileChange,
  type GitStatus
} from '@shared/git.js'
import FileIcon from './FileIcon.js'

interface SourceControlProps {
  status: GitStatus
  onRefresh: () => Promise<void>
  onOpenDiff: (path: string, opts: { staged?: boolean }) => void
}

const KIND_COLOR: Record<string, string> = {
  modified: 'text-amber-500',
  added: 'text-emerald-500',
  untracked: 'text-emerald-500',
  deleted: 'text-red-500',
  renamed: 'text-blue-500',
  conflict: 'text-red-500'
}

export default function SourceControl({
  status,
  onRefresh,
  onOpenDiff
}: SourceControlProps): React.JSX.Element {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await onRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!status.isRepo) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <GitBranch size={22} className="text-faint" />
        <p className="text-sm text-muted">This vault isn’t a git repository yet.</p>
        <button
          className="btn-primary text-[13px]"
          disabled={busy}
          onClick={() => run(() => window.api.git.init())}
        >
          Initialize Repository
        </button>
      </div>
    )
  }

  const staged = status.changes.filter(isStaged)
  const unstaged = status.changes.filter(isUnstaged)

  const commit = () =>
    run(async () => {
      await window.api.git.commit(message)
      setMessage('')
    })

  const row = (
    change: GitFileChange,
    opts: { staged: boolean; actions: React.ReactNode }
  ): React.JSX.Element => {
    const cls = classify(change.index, change.working)
    const name = change.path.split('/').pop() ?? change.path
    return (
      <div key={`${opts.staged}-${change.path}`} className="row group pr-1">
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pl-3 text-left text-[13px]"
          title={change.path}
          onClick={() => onOpenDiff(change.path, { staged: opts.staged })}
        >
          <FileIcon name={name} className="shrink-0 text-faint" />
          <span className="truncate">{name}</span>
        </button>
        <span className="flex items-center opacity-0 transition group-hover:opacity-100">
          {opts.actions}
        </span>
        <span className={`w-4 text-center text-xs font-semibold ${KIND_COLOR[cls.kind]}`}>
          {cls.letter}
        </span>
      </div>
    )
  }

  const actionBtn = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button className="icon-btn !h-6 !w-6" title={label} aria-label={label} onClick={onClick}>
      {icon}
    </button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Branch + sync */}
      <div className="flex items-center gap-2 px-3 py-2 text-[13px]">
        <GitBranch size={14} className="shrink-0 text-faint" />
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{status.branch}</span>
        <button
          className="btn !h-7 !px-2"
          title="Pull, then push"
          disabled={busy}
          onClick={() => run(async () => { await window.api.git.pull(); await window.api.git.push() })}
        >
          <ArrowDownUp size={13} strokeWidth={1.75} />
          {status.behind > 0 && <span>↓{status.behind}</span>}
          {status.ahead > 0 && <span>↑{status.ahead}</span>}
        </button>
        <button className="icon-btn" title="Refresh" disabled={busy} onClick={() => run(async () => {})}>
          <RefreshCw size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Commit box */}
      <div className="px-3 pb-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Message (commit ${staged.length} staged)`}
          rows={2}
          className="w-full resize-none rounded-md border border-line bg-transparent px-2.5 py-1.5 text-[13px] text-ink outline-none transition focus:border-accent"
        />
        <button
          className="btn-primary mt-1.5 w-full justify-center text-[13px]"
          disabled={busy || staged.length === 0 || !message.trim()}
          onClick={commit}
        >
          <Check size={15} strokeWidth={2} />
          Commit
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {staged.length > 0 && (
          <>
            <GroupHeader
              label="Staged Changes"
              count={staged.length}
              action={actionBtn('Unstage all', <Minus size={13} strokeWidth={2} />, () =>
                run(() => window.api.git.unstage(staged.map((c) => c.path)))
              )}
            />
            {staged.map((c) =>
              row(c, {
                staged: true,
                actions: actionBtn('Unstage', <Minus size={13} strokeWidth={2} />, () =>
                  run(() => window.api.git.unstage([c.path]))
                )
              })
            )}
          </>
        )}

        {unstaged.length > 0 && (
          <>
            <GroupHeader
              label="Changes"
              count={unstaged.length}
              action={actionBtn('Stage all', <Plus size={13} strokeWidth={2} />, () =>
                run(() => window.api.git.stage(unstaged.map((c) => c.path)))
              )}
            />
            {unstaged.map((c) =>
              row(c, {
                staged: false,
                actions: (
                  <>
                    {actionBtn('Discard', <RotateCcw size={13} strokeWidth={2} />, () => {
                      if (window.confirm(`Discard changes to "${c.path}"?`)) {
                        run(() => window.api.git.discard(c.path))
                      }
                    })}
                    {actionBtn('Stage', <Plus size={13} strokeWidth={2} />, () =>
                      run(() => window.api.git.stage([c.path]))
                    )}
                  </>
                )
              })
            )}
          </>
        )}

        {staged.length === 0 && unstaged.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted">No changes.</p>
        )}
      </div>
    </div>
  )
}

function GroupHeader({
  label,
  count,
  action
}: {
  label: string
  count: number
  action: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="group flex items-center gap-1 px-3 pb-1 pt-2">
      <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
        {label} · {count}
      </span>
      <span className="opacity-0 transition group-hover:opacity-100">{action}</span>
    </div>
  )
}
