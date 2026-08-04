/**
 * Vault filesystem helpers for the main process.
 *
 * Deliberately free of any Electron import so the security-critical path
 * validation and atomic-write logic can be unit tested in plain Node.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { FileNode } from '../shared/types.js'

/** Directories never surfaced in the tree or scanned into it. */
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.obsidian', '.trash'])

/**
 * Resolve a vault-relative path to an absolute path, guaranteeing the result
 * stays inside the vault root. This is the single choke point that prevents
 * path-traversal (`../../etc/passwd`) from an untrusted renderer (design §3).
 *
 * @throws if the resolved path escapes the vault root.
 */
export function resolveInVault(root: string, relPath: string): string {
  const abs = path.resolve(root, relPath)
  const rel = path.relative(root, abs)
  // `rel` starting with `..` (or being absolute) means we climbed out of root.
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes vault: ${relPath}`)
  }
  return abs
}

/**
 * Atomically write UTF-8 content: write to a sibling temp file, then rename
 * over the target. `rename` is atomic on the same filesystem on all three
 * target platforms, so a crash mid-save never yields a truncated note
 * (design §4).
 */
export async function atomicWrite(absPath: string, content: string): Promise<void> {
  const dir = path.dirname(absPath)
  const tmp = path.join(dir, `.${path.basename(absPath)}.${process.pid}.tmp`)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(tmp, content, 'utf8')
  try {
    await fs.rename(tmp, absPath)
  } catch (err) {
    await fs.rm(tmp, { force: true })
    throw err
  }
}

/**
 * Create a new vault file, failing if it already exists (the `wx` flag) so we
 * never clobber an existing note. Parent folders are created as needed.
 */
export async function createFile(root: string, relPath: string, content = ''): Promise<void> {
  const abs = resolveInVault(root, relPath)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, { encoding: 'utf8', flag: 'wx' })
}

/** Create a new folder inside the vault (no-op if it already exists). */
export async function createFolder(root: string, relPath: string): Promise<void> {
  const abs = resolveInVault(root, relPath)
  await fs.mkdir(abs, { recursive: true })
}

/**
 * Rename/move a vault entry. Both source and destination are validated against
 * the vault root, and the destination's parent folder is created if missing.
 */
export async function renameInVault(root: string, from: string, to: string): Promise<void> {
  const absFrom = resolveInVault(root, from)
  const absTo = resolveInVault(root, to)
  await fs.mkdir(path.dirname(absTo), { recursive: true })
  await fs.rename(absFrom, absTo)
}

/**
 * Recursively scan the vault into a file tree of Markdown files and the
 * folders containing them. Empty folders and ignored dirs are omitted.
 * Adequate up to a few thousand notes (design §4).
 */
export async function listTree(root: string, rel = ''): Promise<FileNode[]> {
  const abs = path.join(root, rel)
  const entries = await fs.readdir(abs, { withFileTypes: true })
  const nodes: FileNode[] = []

  for (const entry of entries) {
    const childRel = path.posix.join(rel, entry.name)
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      const children = await listTree(root, childRel)
      if (children.length > 0) {
        nodes.push({ relPath: childRel, name: entry.name, isDir: true, children })
      }
    } else if (entry.isFile() && /\.(md|markdown|csv)$/i.test(entry.name)) {
      nodes.push({ relPath: childRel, name: entry.name, isDir: false })
    }
  }

  // Folders first, then files; each group alphabetical.
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return nodes
}
