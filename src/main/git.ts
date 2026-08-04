/**
 * Git operations for the open vault (treated as the repo root), backed by
 * `simple-git`. Requires git installed; every call degrades gracefully when the
 * vault isn't a repo. Pure classification/parsing lives in ../shared/git.ts.
 */
import { simpleGit, type SimpleGit } from 'simple-git'
import type { GitCommit, GitStatus } from '../shared/git.js'

/** One SimpleGit instance per repo root. */
const instances = new Map<string, SimpleGit>()

function repo(root: string): SimpleGit {
  let g = instances.get(root)
  if (!g) {
    g = simpleGit(root)
    instances.set(root, g)
  }
  return g
}

/** Whether `root` is inside a git working tree. */
export async function isRepo(root: string): Promise<boolean> {
  try {
    return await repo(root).checkIsRepo()
  } catch {
    return false
  }
}

/** Initialise a new repository at the vault root. */
export async function initRepo(root: string): Promise<void> {
  await repo(root).init()
}

/** Branch, ahead/behind, and per-file change summary. */
export async function status(root: string): Promise<GitStatus> {
  const g = repo(root)
  if (!(await isRepo(root))) {
    return { isRepo: false, branch: '', ahead: 0, behind: 0, changes: [] }
  }
  const s = await g.status()
  return {
    isRepo: true,
    branch: s.current ?? '',
    ahead: s.ahead,
    behind: s.behind,
    changes: s.files.map((f) => ({ path: f.path, index: f.index, working: f.working_dir }))
  }
}

export async function stage(root: string, paths: string[]): Promise<void> {
  await repo(root).add(paths)
}

/** Unstage (`git reset -- <paths>`). */
export async function unstage(root: string, paths: string[]): Promise<void> {
  await repo(root).reset(['--', ...paths])
}

/** Discard working-tree changes to a tracked file (`git checkout -- <path>`). */
export async function discard(root: string, path: string): Promise<void> {
  await repo(root).checkout(['--', path])
}

export async function commit(root: string, message: string): Promise<void> {
  await repo(root).commit(message)
}

export async function push(root: string): Promise<void> {
  await repo(root).push()
}

export async function pull(root: string): Promise<void> {
  await repo(root).pull()
}

/** Recent commits, optionally limited to a single file's history. */
export async function log(root: string, path?: string): Promise<GitCommit[]> {
  const result = await repo(root).log(path ? { maxCount: 50, file: path } : { maxCount: 50 })
  return result.all.map((c) => ({
    hash: c.hash,
    shortHash: c.hash.slice(0, 7),
    message: c.message,
    author: c.author_name,
    date: c.date
  }))
}

/**
 * Unified diff for a path: the working-tree change by default, the staged
 * change when `staged`, or a specific commit's patch when `commit` is given.
 */
export async function diff(
  root: string,
  path: string,
  opts: { staged?: boolean; commit?: string } = {}
): Promise<string> {
  const g = repo(root)
  if (opts.commit) return g.show(['--format=', opts.commit, '--', path])
  return g.diff(opts.staged ? ['--staged', '--', path] : ['--', path])
}
