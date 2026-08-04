/** Tests for the security-critical vault filesystem helpers. */
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  atomicWrite,
  createFile,
  createFolder,
  listTree,
  renameInVault,
  resolveInVault
} from './vault.js'

describe('resolveInVault', () => {
  const root = path.resolve('/vault')

  it('resolves a simple relative path inside the root', () => {
    expect(resolveInVault(root, 'note.md')).toBe(path.join(root, 'note.md'))
  })

  it('resolves nested paths', () => {
    expect(resolveInVault(root, 'projects/design.md')).toBe(
      path.join(root, 'projects', 'design.md')
    )
  })

  it('rejects parent-directory traversal', () => {
    expect(() => resolveInVault(root, '../secret.md')).toThrow(/escapes vault/)
  })

  it('rejects deep traversal that lands outside the root', () => {
    expect(() => resolveInVault(root, 'a/../../etc/passwd')).toThrow(/escapes vault/)
  })

  it('rejects an absolute path escape', () => {
    expect(() => resolveInVault(root, path.resolve('/etc/passwd'))).toThrow(/escapes vault/)
  })

  it('rejects the root itself (empty relative path)', () => {
    expect(() => resolveInVault(root, '.')).toThrow(/escapes vault/)
  })
})

describe('filesystem helpers', () => {
  let dir: string
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'notula-'))
  })
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('atomicWrite creates a file with the given content', async () => {
    const target = path.join(dir, 'note.md')
    await atomicWrite(target, '# Hello')
    expect(await fs.readFile(target, 'utf8')).toBe('# Hello')
  })

  it('atomicWrite overwrites and leaves no temp files behind', async () => {
    const target = path.join(dir, 'note.md')
    await atomicWrite(target, 'first')
    await atomicWrite(target, 'second')
    expect(await fs.readFile(target, 'utf8')).toBe('second')
    const leftovers = (await fs.readdir(dir)).filter((f) => f.includes('.tmp'))
    expect(leftovers).toEqual([])
  })

  it('atomicWrite creates missing parent directories', async () => {
    const target = path.join(dir, 'sub', 'deep', 'note.md')
    await atomicWrite(target, 'x')
    expect(await fs.readFile(target, 'utf8')).toBe('x')
  })

  it('listTree returns markdown files and folders, sorted, ignoring non-md', async () => {
    await fs.writeFile(path.join(dir, 'b.md'), '')
    await fs.writeFile(path.join(dir, 'a.md'), '')
    await fs.writeFile(path.join(dir, 'notes.txt'), '')
    await fs.mkdir(path.join(dir, 'projects'))
    await fs.writeFile(path.join(dir, 'projects', 'design.md'), '')

    const tree = await listTree(dir)
    // Folder first, then files alphabetically.
    expect(tree.map((n) => n.name)).toEqual(['projects', 'a.md', 'b.md'])
    const projects = tree[0]
    expect(projects.isDir).toBe(true)
    expect(projects.children?.map((c) => c.name)).toEqual(['design.md'])
  })

  it('createFile writes a new note and refuses to overwrite', async () => {
    await createFile(dir, 'new.md', '# New')
    expect(await fs.readFile(path.join(dir, 'new.md'), 'utf8')).toBe('# New')
    await expect(createFile(dir, 'new.md', 'x')).rejects.toThrow()
  })

  it('createFile rejects path traversal', async () => {
    await expect(createFile(dir, '../escape.md')).rejects.toThrow(/escapes vault/)
  })

  it('createFolder makes a directory inside the vault', async () => {
    await createFolder(dir, 'sub/deep')
    const stat = await fs.stat(path.join(dir, 'sub', 'deep'))
    expect(stat.isDirectory()).toBe(true)
  })

  it('renameInVault moves a file, creating the destination folder', async () => {
    await createFile(dir, 'a.md', 'hi')
    await renameInVault(dir, 'a.md', 'folder/b.md')
    expect(await fs.readFile(path.join(dir, 'folder', 'b.md'), 'utf8')).toBe('hi')
    await expect(fs.access(path.join(dir, 'a.md'))).rejects.toThrow()
  })

  it('renameInVault rejects a destination outside the vault', async () => {
    await createFile(dir, 'a.md', 'hi')
    await expect(renameInVault(dir, 'a.md', '../b.md')).rejects.toThrow(/escapes vault/)
  })

  it('listTree omits ignored and empty directories', async () => {
    await fs.mkdir(path.join(dir, '.git'))
    await fs.writeFile(path.join(dir, '.git', 'config.md'), '')
    await fs.mkdir(path.join(dir, 'empty'))
    await fs.writeFile(path.join(dir, 'keep.md'), '')

    const tree = await listTree(dir)
    expect(tree.map((n) => n.name)).toEqual(['keep.md'])
  })
})
