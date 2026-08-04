/**
 * Pure git helpers shared by the main process (status IO) and the renderer
 * (tree badges + diff rendering). No git or Node here — just classification and
 * parsing, so it's cheap to unit test.
 */

/** A file's change, from `git status` porcelain codes. */
export interface GitFileChange {
  /** Vault-/repo-relative path (POSIX separators). */
  path: string
  /** Staged (index) status code, e.g. `M`, `A`, `D`, ` `. */
  index: string
  /** Working-tree status code, e.g. `M`, `?`, ` `. */
  working: string
}

/** One entry in the working/staged/branch summary. */
export interface GitStatus {
  isRepo: boolean
  branch: string
  ahead: number
  behind: number
  changes: GitFileChange[]
}

/** A commit in a file's history. */
export interface GitCommit {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

/** Classification of a change for display (badge letter + semantic kind). */
export interface ChangeClass {
  letter: string
  kind: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflict'
  /** True when the index (staged) side has a change. */
  staged: boolean
}

const KIND: Record<string, ChangeClass['kind']> = {
  M: 'modified',
  A: 'added',
  D: 'deleted',
  R: 'renamed',
  C: 'added'
}

/** Classify a change from its index/working codes. */
export function classify(index: string, working: string): ChangeClass {
  if (index === '?' || working === '?') return { letter: 'U', kind: 'untracked', staged: false }
  if (index === 'U' || working === 'U') return { letter: '!', kind: 'conflict', staged: false }
  const staged = index !== ' ' && index !== ''
  const workingChanged = working !== ' ' && working !== ''
  const code = workingChanged ? working : index
  return { letter: code || 'M', kind: KIND[code] ?? 'modified', staged }
}

/** True when the file has staged (index) changes. */
export function isStaged(c: GitFileChange): boolean {
  return c.index !== ' ' && c.index !== '' && c.index !== '?'
}

/** True when the file has working-tree changes (including untracked). */
export function isUnstaged(c: GitFileChange): boolean {
  return c.working !== ' ' && c.working !== ''
}

/** A single line of a rendered unified diff. */
export interface DiffLine {
  type: 'add' | 'del' | 'context' | 'hunk' | 'meta'
  text: string
}

/** Parse a unified diff into typed lines for coloured rendering. */
export function parseDiff(diff: string): DiffLine[] {
  if (!diff) return []
  return diff.split('\n').map((line): DiffLine => {
    if (line.startsWith('@@')) return { type: 'hunk', text: line }
    if (
      line.startsWith('diff ') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('new file') ||
      line.startsWith('deleted file') ||
      line.startsWith('similarity ') ||
      line.startsWith('rename ')
    ) {
      return { type: 'meta', text: line }
    }
    if (line.startsWith('+')) return { type: 'add', text: line.slice(1) }
    if (line.startsWith('-')) return { type: 'del', text: line.slice(1) }
    return { type: 'context', text: line.replace(/^ /, '') }
  })
}
