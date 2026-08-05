/**
 * Native application menu. App-specific items send a `menu:action` to the
 * renderer (single source of truth for New Note, Save, …); the rest use
 * built-in roles for standard edit/view/window behaviour and accelerators.
 */
import { Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'

const REPO_URL = 'https://github.com/andrew-hoffmaster/notula'

/** Build the application menu bound to a window. */
export function buildAppMenu(win: BrowserWindow): Menu {
  const send = (action: string) => win.webContents.send('menu:action', action)
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => send('new-note') },
        { label: 'New Folder', click: () => send('new-folder') },
        { label: 'Open Vault…', accelerator: 'CmdOrCtrl+O', click: () => send('open-vault') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Markdown Help', click: () => send('help') },
        { label: 'Appearance Settings', click: () => send('settings') },
        { type: 'separator' },
        { label: 'GitHub Repository', click: () => void shell.openExternal(REPO_URL) },
        { label: 'About Notula', click: () => send('about') }
      ]
    }
  ]

  return Menu.buildFromTemplate(template)
}
