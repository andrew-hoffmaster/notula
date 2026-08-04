/**
 * Welcome screen shown when no vault is open: brand lockup, a one-line pitch,
 * and the primary "Open Vault" action.
 */
import { FolderOpen } from 'lucide-react'
import logoLockup from '../assets/logo-lockup.svg'

interface WelcomeProps {
  /** Open the native folder picker to choose a vault. */
  onOpen: () => void
}

export default function Welcome({ onOpen }: WelcomeProps): React.JSX.Element {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-app">
      {/* Soft brand glow behind the lockup. */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-80 w-80 -translate-y-24 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: 'var(--mark)' }}
      />

      <div className="relative flex flex-col items-center gap-7 px-6">
        <img src={logoLockup} alt="Notula" className="h-20 w-auto dark:invert" />

        <p className="max-w-sm text-center text-sm leading-relaxed text-muted">
          A local-first Markdown editor. Your notes stay as plain{' '}
          <code className="rounded bg-hover px-1 text-[0.8em] text-ink">.md</code> files on your
          disk — no account, no cloud, no lock-in.
        </p>

        <button onClick={onOpen} className="btn-primary">
          <FolderOpen size={16} strokeWidth={2} />
          Open Vault…
        </button>

        <p className="text-xs text-faint">Pick a folder of Markdown files to get started</p>
      </div>
    </div>
  )
}
