/** Git status for the open vault, refetched on demand and on vault change. */
import { useCallback, useEffect, useState } from 'react'
import type { GitStatus } from '@shared/git.js'

const EMPTY: GitStatus = { isRepo: false, branch: '', ahead: 0, behind: 0, changes: [] }

export function useGit(vaultRoot: string | null): { status: GitStatus; refresh: () => Promise<void> } {
  const [status, setStatus] = useState<GitStatus>(EMPTY)

  const refresh = useCallback(async () => {
    if (!vaultRoot) {
      setStatus(EMPTY)
      return
    }
    try {
      setStatus(await window.api.git.status())
    } catch {
      setStatus(EMPTY)
    }
  }, [vaultRoot])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { status, refresh }
}
