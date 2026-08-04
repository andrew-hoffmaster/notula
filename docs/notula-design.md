# Markdown Editor — Design Document

**Status:** Draft
**Date:** August 2026
**Author:** Andrew

---

## 1. Overview

A cross-platform desktop Markdown editor for macOS, Windows, and Linux. Plain
`.md` files on the local filesystem are the source of truth. No server, no
database, no account.

### Goals

- Fast, reliable editing of a folder of Markdown files ("vault")
- Live preview with GFM support (tables, task lists, strikethrough)
- Export to PDF
- Import from Word (`.docx`)
- Zero data lock-in — the vault is readable and editable without this app

### Non-goals (explicitly deferred or excluded)

| Item | Status | Rationale |
|---|---|---|
| Git integration | ~~Excluded~~ **Added (post-v1)** | Reversed by request: in-app source control (status badges, stage/commit/push/pull, diff & history) over the vault via `simple-git`. Vault stays plain files; git is optional and the app works without a repo. |
| Google Docs / cloud sync | Excluded | Out of scope; folder-level sync tools already work |
| Real-time collaboration | Excluded | Requires a backend, contradicts local-first design |
| Mobile apps | Deferred | Would force a different shell decision |
| Web build | Deferred | Frontend is portable; revisit after v1 |
| Plugin system | Deferred | Premature before the core is stable |

---

## 2. Stack Decisions

| Layer | Choice | Notes |
|---|---|---|
| Shell | Electron | Bundles Chromium — identical rendering on all three platforms |
| Frontend | React + Vite + TypeScript | Not Next.js (see below) |
| Editor core | CodeMirror 6 | Mature text editing: IME, undo, selection, highlighting |
| Markdown pipeline | `unified` / `remark` / `rehype` | With `rehype-sanitize` |
| Styling | Tailwind | Carries over from existing work |
| Settings store | `electron-store` (JSON) | In `app.getPath('userData')` |
| File watching | `chokidar` | Detect external edits |
| PDF export | `webContents.printToPDF()` | Native to Electron, no extra dependency |
| DOCX import | `mammoth` + `turndown` | Plus `turndown-plugin-gfm` |
| Packaging | `electron-builder` | Handles signing and auto-update |

### Why Electron over Tauri / Wails

Tauri and Wails both use the OS-provided webview, which means WebKitGTK on
Linux — an older engine that produces CSS and text-rendering bugs that can't be
reproduced on macOS. For a text-rendering-heavy application that is the
dominant risk. Electron bundles Chromium, so rendering is identical everywhere.

Secondary benefit: Obsidian, VS Code, and Logseq are all Electron, so the
failure modes of this exact application shape are publicly documented.

Cost accepted: ~120 MB installed size and higher memory baseline.

### Why plain React over Next.js

Next.js is a server framework and there is no server here. Static export mode
disables server components, route handlers, middleware, and ISR — everything
that justifies Next over React — leaving a React SPA with a slower build and
router assumptions that fight `file://` URLs.

A Markdown editor has effectively no pages: one window, several panels.
Routing is the least-needed part of Next. Components, hooks, TypeScript, and
Tailwind config all port to Vite untouched.

---

## 3. Process Architecture

```
┌─────────────────────────────────────────────────────┐
│ MAIN PROCESS (Node)                                 │
│   • All fs access                                   │
│   • chokidar watcher                                │
│   • printToPDF (hidden BrowserWindow)               │
│   • mammoth docx conversion                         │
│   • electron-store settings                         │
│   • Native menus, dialogs                           │
└──────────────────┬──────────────────────────────────┘
                   │ IPC (contextBridge)
┌──────────────────┴──────────────────────────────────┐
│ RENDERER (React + Vite)                             │
│   • CodeMirror 6 editing surface                    │
│   • remark/rehype preview pipeline                  │
│   • File tree, tabs, command palette                │
│   • NO Node access                                  │
└─────────────────────────────────────────────────────┘
```

### Security model

```js
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: path.join(__dirname, 'preload.js')
}
```

This is non-negotiable rather than best-practice boilerplate. The app renders
user-authored Markdown that may contain embedded HTML. An XSS in the preview
pane becomes full remote code execution if the renderer has Node access.
`rehype-sanitize` runs in the preview pipeline for the same reason.

### IPC surface

The preload script exposes a deliberately narrow API. No generic
`readFile(path)` — every call is scoped to the open vault and validated in
main against the vault root to prevent path traversal.

```ts
window.api = {
  vault: {
    open(): Promise<VaultInfo | null>       // shows native dialog
    list(): Promise<FileNode[]>
    onChange(cb: (evt: FileChangeEvent) => void): () => void
  },
  file: {
    read(relPath: string): Promise<string>
    write(relPath: string, content: string): Promise<void>   // atomic
    rename(from: string, to: string): Promise<void>
    delete(relPath: string): Promise<void>
  },
  import: {
    docx(): Promise<{ markdown: string; assets: string[] }>
  },
  export: {
    pdf(html: string, opts: PdfOptions): Promise<string>     // returns path
  },
  settings: {
    get<K extends keyof Settings>(key: K): Promise<Settings[K]>
    set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>
  }
}
```

---

## 4. Storage

### Vault layout

```
my-vault/
├── note.md
├── projects/
│   └── design.md
└── assets/
    └── img-a1b2c3.png
```

Files are the source of truth. Images use **relative** paths so the vault stays
portable when moved between machines.

### What is not in the vault

Settings, window geometry, recent files, and the last-opened vault path live in
a JSON file under `app.getPath('userData')` via `electron-store`. This is
machine state, not user content, and must not pollute the vault.

### Search, and the one future case for SQLite

A recursive scan is adequate up to a few thousand notes. Beyond that, add
SQLite (`better-sqlite3` with FTS5) as an **index only** — a cache fully
rebuildable from the files, stored in `userData`, never in the vault. Because
it is derived state, adding it later requires no architectural change. Deleting
it must never lose data. Not in v1.

### Atomic writes

Write to a temp file in the same directory, then `fs.rename()`. Never truncate
in place. Losing a note to a crash mid-save is the one failure a notes app does
not recover from reputationally, and `rename` is atomic on the same filesystem
on all three target platforms.

### External change policy

`chokidar` watches the vault so a Dropbox sync or an edit in another editor
appears live. Behaviour when a file changes on disk:

| Buffer state | Action |
|---|---|
| Clean | Reload silently |
| Dirty, content identical | Ignore |
| Dirty, content differs | Prompt: keep mine / take theirs / open diff |

This policy is annoying to retrofit and should be built in from the start.

---

## 5. Editor and Preview

CodeMirror 6 provides the editing surface. The hard problems — IME for CJK
input, grapheme-cluster cursor movement, undo grouping, large-document
performance — are solved there and should not be reimplemented.

Preview pipeline:

```
markdown → remark-parse → remark-gfm → remark-rehype
         → rehype-sanitize → rehype-stringify → HTML
```

Preview is debounced (~100 ms) and rendered into a scroll-synced pane.

---

## 6. PDF Export

Render the preview HTML into a **hidden** `BrowserWindow` with print-specific
CSS, then call `printToPDF()`. Rendering into a separate window rather than the
live preview pane prevents editor chrome from leaking into the output.

```js
const pdf = await win.webContents.printToPDF({
  pageSize: 'Letter',
  margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
  printBackground: true,
  displayHeaderFooter: true,
  footerTemplate: '<div style="font-size:9px;width:100%;text-align:center">' +
                  '<span class="pageNumber"></span> / <span class="totalPages"></span></div>'
})
```

Required before calling `printToPDF`:

- `await document.fonts.ready` — otherwise output intermittently uses fallback fonts
- Await all image `onload` events — otherwise images are intermittently missing

Print CSS must include `break-inside: avoid` on `pre`, `table`, and `blockquote`.
Chromium will otherwise split a fenced code block across a page boundary.

---

## 7. Word Import

`mammoth` converts `.docx` → HTML, then `turndown` (+ `turndown-plugin-gfm`)
converts HTML → Markdown. Both run in the main process.

Mammoth is the right tool because it maps Word's **semantic** styles (Heading 1,
List Bullet) rather than chasing raw formatting — exactly the translation
Markdown wants.

### Fidelity expectations

| Survives | Does not survive |
|---|---|
| Headings | Tracked changes |
| Bold / italic | Comments |
| Nested lists | Text boxes |
| Links | Multi-column layout |
| Blockquotes | Equations (OMML) |
| Tables | SmartArt, precise styling |

Surface this in the import dialog rather than letting users discover it.

### Images

Mammoth returns image buffers through a `convertImage` handler. Write each to
`assets/` with a content-hashed filename and rewrite `src` to a relative path.
This is the only real integration work in the import path.

### Validation

Mammoth handles `.docx` only — **not** legacy `.doc`. Validate the extension up
front and return a clear error rather than a stack trace.

---

## 8. Build Order

| Milestone | Scope |
|---|---|
| M1 | Electron shell, vault picker, file tree, CodeMirror editing, atomic save |
| M2 | Preview pipeline with sanitization, scroll sync |
| M3 | chokidar watching + external change policy |
| M4 | PDF export |
| M5 | DOCX import with asset extraction |
| M6 | Settings, native menus, keyboard shortcuts, packaging + auto-update |

---

## 9. Open Questions

1. **Tabs vs. single document?** Affects state shape; decide before M1.
2. **Source mode, WYSIWYG, or split preview as the default?** Split is simplest;
   WYSIWYG would mean ProseMirror instead of CodeMirror, which is a larger
   commitment and should be decided now rather than later.
3. **Multiple vaults open at once, or one window per vault?** One-per-window is
   simpler and matches Obsidian.
4. **Frontmatter handling** — parse and hide YAML frontmatter, or show it as
   text?
5. **Auto-save cadence** — on blur, on a debounce timer, or explicit only? This
   interacts directly with the external-change policy in §4.

---

## 10. Reversibility

The frontend is React + CodeMirror regardless of shell. If Electron's install
size or memory footprint later becomes the binding constraint, moving to Tauri
means rewriting the main process and the IPC layer while the entire renderer
ports unchanged. Similarly, a web build would need only the file layer
swapped for the File System Access API.

Keeping all Node-specific code behind the `window.api` surface defined in §3 is
what preserves both options. No `fs`, `path`, or Electron import should ever
appear in renderer code.
