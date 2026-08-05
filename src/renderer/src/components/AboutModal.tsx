/** About dialog: version, build/runtime info, and links. */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { AppInfo } from '@shared/types.js'
import logoMark from '../assets/logo-mark.svg'

interface AboutModalProps {
  onClose: () => void
}

export default function AboutModal({ onClose }: AboutModalProps): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    window.api.app.info().then(setInfo)
  }, [])

  return (
    <div className="backdrop flex items-center justify-center" onClick={onClose}>
      <div
        className="sheet relative w-80 p-6 text-center text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="icon-btn absolute right-3 top-3"
          aria-label="Close about"
        >
          <X size={16} strokeWidth={2} />
        </button>

        <img src={logoMark} alt="" className="mx-auto h-12 w-12 dark:invert" />
        <h2 className="mt-3 text-lg font-semibold">Notula</h2>
        <p className="text-sm text-muted">
          {info ? `Version ${info.version}` : 'Version …'}
        </p>
        <p className="mt-1 text-xs text-faint">A local-first Markdown editor</p>

        {info && (
          <dl className="mt-4 space-y-1 rounded-lg border border-line bg-panel px-3 py-2 text-left font-mono text-[11px] text-muted">
            <Row k="Electron" v={info.electron} />
            <Row k="Chromium" v={info.chrome} />
            <Row k="Node" v={info.node} />
            <Row k="Platform" v={info.platform} />
          </dl>
        )}

        <p className="mt-4 text-xs text-faint">
          MIT License ·{' '}
          <a href="https://github.com/andrew-hoffmaster/notula" className="text-accent hover:underline">
            GitHub
          </a>
        </p>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <dt>{k}</dt>
      <dd className="truncate text-ink">{v}</dd>
    </div>
  )
}
