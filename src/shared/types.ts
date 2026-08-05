/**
 * Types shared across the main, preload, and renderer processes.
 *
 * These describe the IPC contract (the `window.api` surface from design §3).
 * Keeping them in one place is what lets the renderer stay free of any Node
 * or Electron imports (design §10).
 */

/** Metadata for an opened vault (a folder of Markdown files). */
export interface VaultInfo {
  /** Absolute filesystem path to the vault root. Main process only cares. */
  root: string
  /** Basename of the vault folder, for display. */
  name: string
}

/** A filesystem change observed in the vault by the watcher (design §4). */
export interface FileChangeEvent {
  /** `add`/`unlink` change the tree; `change` may affect an open buffer. */
  kind: 'add' | 'change' | 'unlink'
  /** Vault-relative path (POSIX separators) of the affected file. */
  relPath: string
}

/** A single entry in the vault file tree. */
export interface FileNode {
  /** Path relative to the vault root, using POSIX separators. */
  relPath: string
  /** Display name (basename). */
  name: string
  /** True for directories. */
  isDir: boolean
  /** Child entries; present only for directories. */
  children?: FileNode[]
}

/** Result of importing a Word `.docx` document (design §7). */
export interface DocxImport {
  /** Suggested note name (source filename without extension). */
  name: string
  /** Converted Markdown body. */
  markdown: string
  /** Vault-relative paths of images extracted to `assets/`. */
  assets: string[]
  /** Fidelity warnings (features that did not survive conversion). */
  warnings: string[]
}

/** Options for PDF export (design §6). */
export interface PdfOptions {
  /** Document title, used as the default save filename. */
  title: string
}

import type { GitCommit, GitStatus } from './git.js'

/** App version + runtime build info (About dialog). */
export interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
  platform: string
}

/** The narrow API exposed to the renderer via contextBridge (design §3). */
export interface Api {
  vault: {
    /** Show a native folder picker and open the chosen vault. */
    open(): Promise<VaultInfo | null>
    /** The currently open vault (restored from last launch), or null. */
    current(): Promise<VaultInfo | null>
    /** List the current vault as a file tree (Markdown files + folders). */
    list(): Promise<FileNode[]>
    /** Subscribe to external filesystem changes. Returns an unsubscribe fn. */
    onChange(cb: (evt: FileChangeEvent) => void): () => void
  }
  file: {
    /** Read a vault file's UTF-8 contents by vault-relative path. */
    read(relPath: string): Promise<string>
    /** Atomically write UTF-8 contents to a vault-relative path. */
    write(relPath: string, content: string): Promise<void>
    /** Create a new empty (or seeded) file; rejects if it already exists. */
    create(relPath: string, content?: string): Promise<void>
    /** Create a new folder inside the vault. */
    createFolder(relPath: string): Promise<void>
    /** Rename/move a file or folder within the vault. */
    rename(from: string, to: string): Promise<void>
    /** Move a file or folder to the OS trash (reversible). */
    delete(relPath: string): Promise<void>
    /**
     * Save a pasted/dropped image into `assets/` with a content-hashed name.
     * Returns the vault-relative path to reference from Markdown.
     */
    saveImage(bytes: Uint8Array, contentType: string): Promise<string>
  }
  export: {
    /**
     * Render sanitized preview HTML to a PDF via a hidden print window and a
     * native save dialog. Resolves to the saved path, or null if cancelled.
     */
    pdf(bodyHtml: string, opts: PdfOptions): Promise<string | null>
  }
  import: {
    /**
     * Pick a `.docx` via a native dialog and convert it to Markdown, extracting
     * images into the vault. Resolves to null if cancelled.
     */
    docx(): Promise<DocxImport | null>
    /**
     * Pick a `.csv`/`.tsv` via a native dialog and convert it to a Markdown
     * table. Resolves to null if cancelled.
     */
    csv(): Promise<{ name: string; markdown: string } | null>
  }
  /** App-level integration: native menu, quit lifecycle, error reporting. */
  app: {
    /** Version + build/runtime info for the About dialog. */
    info(): Promise<AppInfo>
    /** Subscribe to native-menu actions (New Note, Save, …). Returns unsubscribe. */
    onMenu(cb: (action: string) => void): () => void
    /** Register a flush run before the window closes (persist unsaved edits). */
    onBeforeClose(flush: () => Promise<void>): void
    /** Report a renderer error to the main-process log. */
    reportError(message: string): void
  }
  /** Git source control over the open vault (design reversal — see docs). */
  git: {
    status(): Promise<GitStatus>
    init(): Promise<void>
    stage(paths: string[]): Promise<void>
    unstage(paths: string[]): Promise<void>
    discard(path: string): Promise<void>
    commit(message: string): Promise<void>
    push(): Promise<void>
    pull(): Promise<void>
    log(path?: string): Promise<GitCommit[]>
    diff(path: string, opts?: { staged?: boolean; commit?: string }): Promise<string>
  }
}
