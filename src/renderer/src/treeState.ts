/**
 * File-tree UI state helpers: expanded folders and favorite files.
 *
 * Pure logic (toggling, path collection) is separated from the browser-only
 * localStorage persistence so it can be unit tested without a DOM.
 */
import type { FileNode } from '@shared/types.js'

/** Add `item` if absent, remove it if present. Returns a new array. */
export function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

/** Flatten a tree into the relative paths of all files (folders excluded). */
export function collectFilePaths(nodes: FileNode[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    if (node.isDir) out.push(...collectFilePaths(node.children ?? []))
    else out.push(node.relPath)
  }
  return out
}

/**
 * Keep only favorites that still exist in the current tree, in tree order —
 * so a favorite whose file was deleted externally quietly drops off.
 */
export function existingFavorites(favorites: string[], nodes: FileNode[]): string[] {
  const present = new Set(collectFilePaths(nodes))
  return favorites.filter((p) => present.has(p))
}

/**
 * Build a vault-root `.md` filename from `base` that doesn't collide with any
 * path in `existing`, appending `-2`, `-3`, … as needed.
 */
export function uniqueMarkdownName(base: string, existing: string[]): string {
  const taken = new Set(existing)
  let name = `${base}.md`
  for (let i = 2; taken.has(name); i++) name = `${base}-${i}.md`
  return name
}

const PREFIX = 'notula'

/** localStorage key namespaced per vault so state doesn't leak between vaults. */
export function storageKey(kind: 'favs' | 'expanded', vaultRoot: string): string {
  return `${PREFIX}:${kind}:${vaultRoot}`
}

/** Load a persisted string list; returns [] on missing or malformed data. */
export function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Persist a string list. */
export function saveList(key: string, list: string[]): void {
  localStorage.setItem(key, JSON.stringify(list))
}
