/** Tests for the JSON settings store (path-injected, no Electron needed). */
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadSettingsFrom, saveSettingsTo } from './settings.js'

describe('settings store', () => {
  let dir: string
  let file: string
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'notula-settings-'))
    file = path.join(dir, 'settings.json')
  })
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('returns {} when the file is missing', async () => {
    expect(await loadSettingsFrom(file)).toEqual({})
  })

  it('round-trips saved settings', async () => {
    await saveSettingsTo(file, { lastVault: '/vaults/notes' })
    expect(await loadSettingsFrom(file)).toEqual({ lastVault: '/vaults/notes' })
  })

  it('returns {} on malformed JSON rather than throwing', async () => {
    await fs.writeFile(file, '{ not json', 'utf8')
    expect(await loadSettingsFrom(file)).toEqual({})
  })
})
