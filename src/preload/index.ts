/**
 * Preload script: the only bridge between renderer and main.
 *
 * Exposes a deliberately narrow, typed API on `window.api` (design §3). Every
 * method is a thin `ipcRenderer.invoke` — no `fs`, `path`, or Node primitives
 * cross into the renderer.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Api, FileChangeEvent } from '../shared/types.js'

const api: Api = {
  vault: {
    open: () => ipcRenderer.invoke('vault:open'),
    current: () => ipcRenderer.invoke('vault:current'),
    list: () => ipcRenderer.invoke('vault:list'),
    onChange: (cb) => {
      const listener = (_e: IpcRendererEvent, evt: FileChangeEvent) => cb(evt)
      ipcRenderer.on('vault:change', listener)
      return () => ipcRenderer.removeListener('vault:change', listener)
    }
  },
  file: {
    read: (relPath) => ipcRenderer.invoke('file:read', relPath),
    write: (relPath, content) => ipcRenderer.invoke('file:write', relPath, content),
    create: (relPath, content) => ipcRenderer.invoke('file:create', relPath, content),
    createFolder: (relPath) => ipcRenderer.invoke('file:createFolder', relPath),
    rename: (from, to) => ipcRenderer.invoke('file:rename', from, to),
    delete: (relPath) => ipcRenderer.invoke('file:delete', relPath),
    saveImage: (bytes, contentType) => ipcRenderer.invoke('file:saveImage', bytes, contentType)
  },
  export: {
    pdf: (bodyHtml, opts) => ipcRenderer.invoke('export:pdf', bodyHtml, opts)
  },
  import: {
    docx: () => ipcRenderer.invoke('import:docx'),
    csv: () => ipcRenderer.invoke('import:csv')
  },
  app: {
    onMenu: (cb) => {
      const listener = (_e: IpcRendererEvent, action: string) => cb(action)
      ipcRenderer.on('menu:action', listener)
      return () => ipcRenderer.removeListener('menu:action', listener)
    },
    onBeforeClose: (flush) => {
      ipcRenderer.on('app:before-close', async () => {
        try {
          await flush()
        } finally {
          ipcRenderer.send('app:flush-done')
        }
      })
    },
    reportError: (message) => ipcRenderer.send('log:error', message)
  },
  git: {
    status: () => ipcRenderer.invoke('git:status'),
    init: () => ipcRenderer.invoke('git:init'),
    stage: (paths) => ipcRenderer.invoke('git:stage', paths),
    unstage: (paths) => ipcRenderer.invoke('git:unstage', paths),
    discard: (path) => ipcRenderer.invoke('git:discard', path),
    commit: (message) => ipcRenderer.invoke('git:commit', message),
    push: () => ipcRenderer.invoke('git:push'),
    pull: () => ipcRenderer.invoke('git:pull'),
    log: (path) => ipcRenderer.invoke('git:log', path),
    diff: (path, opts) => ipcRenderer.invoke('git:diff', path, opts)
  }
}

contextBridge.exposeInMainWorld('api', api)
