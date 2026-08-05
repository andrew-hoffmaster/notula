/**
 * Catches render/runtime errors in the tree and shows a recoverable fallback
 * instead of a blank white screen. The error is reported to the main-process
 * log for diagnosis.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    window.api?.app.reportError(`${error.stack ?? error.message}\n${info.componentStack ?? ''}`)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-app px-8 text-center text-ink">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted">
          The editor hit an unexpected error. Your notes are plain files on disk and are safe.
          Reloading usually fixes it.
        </p>
        <pre className="max-h-40 max-w-lg overflow-auto rounded-md border border-line bg-panel p-3 text-left font-mono text-xs text-muted">
          {this.state.error.message}
        </pre>
        <button className="btn-primary text-[13px]" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
