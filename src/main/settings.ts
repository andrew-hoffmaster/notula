/**
 * Tiny JSON-file settings store in `userData` (design §4: machine state, never
 * in the vault).
 *
 * ponytail: a hand-rolled read/write over one JSON file instead of pulling in
 * electron-store — for a couple of keys the dep's schema/migration features
 * aren't worth it. Swap to electron-store if settings grow or need atomicity.
 */
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { app } from 'electron'

/** Persisted machine-level settings (not user content). */
export interface Settings {
  /** Absolute path of the last opened vault, reopened on next launch. */
  lastVault?: string
}

/** Load settings from an explicit file path; returns {} if missing/malformed. */
export async function loadSettingsFrom(file: string): Promise<Settings> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? (parsed as Settings) : {}
  } catch {
    return {}
  }
}

/** Persist settings to an explicit file path. */
export async function saveSettingsTo(file: string, settings: Settings): Promise<void> {
  await fs.writeFile(file, JSON.stringify(settings, null, 2), 'utf8')
}

/** Path of the settings file in the app's per-user data directory. */
function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

/** Read the current settings. */
export function loadSettings(): Promise<Settings> {
  return loadSettingsFrom(settingsFile())
}

/** Merge and persist a partial settings update. */
export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await loadSettings()
  await saveSettingsTo(settingsFile(), { ...current, ...patch })
}
