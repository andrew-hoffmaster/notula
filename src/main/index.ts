/**
 * Electron main process entry point.
 *
 * Owns all filesystem access, creates the app window with the hardened
 * webPreferences from design §3, and registers the IPC handlers that back
 * the `window.api` surface. The renderer never touches Node directly.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, net, protocol, shell } from 'electron'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { pathToFileURL } from 'node:url'
import os from 'node:os'
import chokidar, { type FSWatcher } from 'chokidar'
import {
  atomicWrite,
  createFile,
  createFolder,
  listTree,
  renameInVault,
  resolveInVault
} from './vault.js'
import { buildPrintHtml, WAIT_FOR_ASSETS } from './pdf.js'
import { assetFilename, convertDocx, extForContentType } from './docx.js'
import { csvToMarkdownTable } from '../shared/csv.js'
import * as git from './git.js'
import { loadSettings, updateSettings } from './settings.js'
import icon from '../../resources/icon.png?asset'
import type { DocxImport, FileChangeEvent, PdfOptions, VaultInfo } from '../shared/types.js'

/** The currently open vault root. `null` until the user opens one. */
let vaultRoot: string | null = null
/** Active chokidar watcher for the open vault, if any. */
let watcher: FSWatcher | null = null

/** Custom image scheme; must match the renderer's markdown pipeline. */
const IMAGE_SCHEME = 'notula-img'

// Privileged so <img src="notula-img://…"> loads like a normal secure image.
// Must run before app `ready`.
protocol.registerSchemesAsPrivileged([
  { scheme: IMAGE_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

/**
 * Serve `notula-img://vault/<rel>` from inside the open vault, reusing the same
 * traversal guard as file reads. Anything outside the vault is refused.
 */
function registerImageProtocol(): void {
  protocol.handle(IMAGE_SCHEME, (request) => {
    if (!vaultRoot) return new Response(null, { status: 404 })
    try {
      const rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
      const abs = resolveInVault(vaultRoot, rel)
      return net.fetch(pathToFileURL(abs).toString())
    } catch {
      return new Response(null, { status: 403 })
    }
  })
}

/**
 * Watch the vault for external edits (Dropbox sync, another editor) and relay
 * changes to the renderer, which applies the external-change policy (§4).
 * Dotfiles are ignored, which also skips our own `.<name>.tmp` atomic-write
 * temp files.
 */
async function startWatching(root: string, win: BrowserWindow): Promise<void> {
  await watcher?.close()
  watcher = chokidar.watch(root, {
    ignoreInitial: true,
    // Ignore dotfiles/dotdirs — this also skips our `.<name>.tmp` write files.
    // Non-.md files are filtered per-event below (can't filter dirs by ext here).
    ignored: (p) => /(^|[\\/])\.[^\\/]+/.test(p)
  })
  const emit = (kind: FileChangeEvent['kind']) => (abs: string) => {
    if (!/\.(md|markdown|csv)$/i.test(abs)) return
    const relPath = path.relative(root, abs).split(path.sep).join('/')
    if (!win.isDestroyed()) win.webContents.send('vault:change', { kind, relPath })
  }
  watcher.on('add', emit('add')).on('change', emit('change')).on('unlink', emit('unlink'))
}

/** Guard IPC calls that require an open vault. */
function requireVault(): string {
  if (!vaultRoot) throw new Error('No vault is open')
  return vaultRoot
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    // Taskbar/window icon (design assets). Linux relies on this; on Win/macOS
    // the packaged bundle icon (electron-builder, M6) takes over.
    icon,
    webPreferences: {
      // Non-negotiable security model (design §3): the renderer displays
      // user-authored Markdown that may embed HTML.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  win.once('ready-to-show', () => win.show())
  attachSpellCheckMenu(win)

  // electron-vite injects the dev server URL; fall back to the built file.
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  return win
}

/**
 * Right-click menu with native spell-check suggestions on misspelled words,
 * plus the standard edit actions. Electron's built-in spellchecker underlines
 * misspellings in the editor (which opts in via `spellcheck="true"`).
 */
function attachSpellCheckMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_e, params) => {
    const menu = new Menu()
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => win.webContents.replaceMisspelling(suggestion)
          })
        )
      }
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(
        new MenuItem({
          label: 'Add to dictionary',
          click: () =>
            win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
    }
    menu.append(new MenuItem({ role: 'cut', enabled: params.editFlags.canCut }))
    menu.append(new MenuItem({ role: 'copy', enabled: params.editFlags.canCopy }))
    menu.append(new MenuItem({ role: 'paste', enabled: params.editFlags.canPaste }))
    if (menu.items.length) menu.popup()
  })
}

/** Register the IPC handlers backing `window.api`. */
function registerIpc(win: BrowserWindow): void {
  ipcMain.handle('vault:open', async (): Promise<VaultInfo | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    vaultRoot = result.filePaths[0]
    await startWatching(vaultRoot, win)
    await updateSettings({ lastVault: vaultRoot })
    return { root: vaultRoot, name: path.basename(vaultRoot) }
  })

  // The currently open vault, if any — lets the renderer restore on launch
  // without re-prompting (backed by the persisted lastVault, see whenReady).
  ipcMain.handle('vault:current', (): VaultInfo | null =>
    vaultRoot ? { root: vaultRoot, name: path.basename(vaultRoot) } : null
  )

  ipcMain.handle('vault:list', () => listTree(requireVault()))

  ipcMain.handle('file:read', (_e, relPath: string) => {
    const abs = resolveInVault(requireVault(), relPath)
    return fs.readFile(abs, 'utf8')
  })

  ipcMain.handle('file:write', (_e, relPath: string, content: string) => {
    const abs = resolveInVault(requireVault(), relPath)
    return atomicWrite(abs, content)
  })

  ipcMain.handle('file:create', (_e, relPath: string, content?: string) =>
    createFile(requireVault(), relPath, content ?? '')
  )

  ipcMain.handle('file:createFolder', (_e, relPath: string) =>
    createFolder(requireVault(), relPath)
  )

  ipcMain.handle('file:rename', (_e, from: string, to: string) =>
    renameInVault(requireVault(), from, to)
  )

  // Save a pasted/dropped image into the vault's assets/ folder, returning its
  // vault-relative path so the renderer can insert a Markdown reference.
  ipcMain.handle('file:saveImage', async (_e, bytes: Uint8Array, contentType: string) => {
    const root = requireVault()
    const buf = Buffer.from(bytes)
    const rel = `assets/${assetFilename(buf, extForContentType(contentType))}`
    await fs.mkdir(path.join(root, 'assets'), { recursive: true })
    await fs.writeFile(resolveInVault(root, rel), buf)
    return rel
  })

  ipcMain.handle('file:delete', (_e, relPath: string) => {
    // Trash rather than hard-delete: reversible, and safer for user content.
    const abs = resolveInVault(requireVault(), relPath)
    return shell.trashItem(abs)
  })

  ipcMain.handle('import:docx', async (): Promise<DocxImport | null> => {
    const root = requireVault()
    const pick = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    })
    if (pick.canceled || pick.filePaths.length === 0) return null

    const docxPath = pick.filePaths[0]
    const { markdown, assets, warnings } = await convertDocx(docxPath, root)
    return {
      name: path.basename(docxPath, path.extname(docxPath)),
      markdown,
      assets,
      warnings
    }
  })

  // --- Git source control (operates on the vault root as the repo) ---------
  ipcMain.handle('git:status', () => git.status(requireVault()))
  ipcMain.handle('git:init', () => git.initRepo(requireVault()))
  ipcMain.handle('git:stage', (_e, paths: string[]) => git.stage(requireVault(), paths))
  ipcMain.handle('git:unstage', (_e, paths: string[]) => git.unstage(requireVault(), paths))
  ipcMain.handle('git:discard', (_e, path: string) => git.discard(requireVault(), path))
  ipcMain.handle('git:commit', (_e, message: string) => git.commit(requireVault(), message))
  ipcMain.handle('git:push', () => git.push(requireVault()))
  ipcMain.handle('git:pull', () => git.pull(requireVault()))
  ipcMain.handle('git:log', (_e, path?: string) => git.log(requireVault(), path))
  ipcMain.handle('git:diff', (_e, path: string, opts) => git.diff(requireVault(), path, opts))

  ipcMain.handle('import:csv', async (): Promise<{ name: string; markdown: string } | null> => {
    requireVault()
    const pick = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV / TSV', extensions: ['csv', 'tsv', 'txt'] }]
    })
    if (pick.canceled || pick.filePaths.length === 0) return null
    const csvPath = pick.filePaths[0]
    const text = await fs.readFile(csvPath, 'utf8')
    return {
      name: path.basename(csvPath, path.extname(csvPath)),
      markdown: csvToMarkdownTable(text)
    }
  })

  ipcMain.handle(
    'export:pdf',
    async (_e, bodyHtml: string, opts: PdfOptions): Promise<string | null> => {
      const root = requireVault()

      const save = await dialog.showSaveDialog({
        defaultPath: `${opts.title || 'export'}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
      if (save.canceled || !save.filePath) return null

      // Render into a hidden window so editor chrome never leaks in (§6).
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
      })
      // Temp file (not in the vault) + <base href> so relative images resolve.
      const tmpHtml = path.join(os.tmpdir(), `notula-print-${process.pid}.html`)
      try {
        await fs.writeFile(tmpHtml, buildPrintHtml(bodyHtml, root), 'utf8')
        await printWin.loadFile(tmpHtml)
        await printWin.webContents.executeJavaScript(WAIT_FOR_ASSETS)

        const pdf = await printWin.webContents.printToPDF({
          pageSize: 'Letter',
          margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
          printBackground: true,
          displayHeaderFooter: true,
          footerTemplate:
            '<div style="font-size:9px;width:100%;text-align:center">' +
            '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
          headerTemplate: '<span></span>'
        })
        await fs.writeFile(save.filePath, pdf)
        return save.filePath
      } finally {
        printWin.destroy()
        await fs.rm(tmpHtml, { force: true })
      }
    }
  )
}

app.whenReady().then(async () => {
  registerImageProtocol()
  const win = createWindow()
  registerIpc(win)

  // Restore the last opened vault if its folder still exists, so the renderer
  // can reopen it on launch without re-prompting (design §4 machine state).
  const { lastVault } = await loadSettings()
  if (lastVault) {
    try {
      if ((await fs.stat(lastVault)).isDirectory()) {
        vaultRoot = lastVault
        await startWatching(lastVault, win)
      }
    } catch {
      // Folder moved or deleted — fall back to the vault picker.
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
