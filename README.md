<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="resources/logo/notula-lockup-horizontal.svg" />
    <img alt="Notula" src="resources/logo/notula-lockup-horizontal-dark.svg" width="360" />
  </picture>
</p>

<p align="center">
  A local-first, cross-platform Markdown editor.<br />
  Your notes stay as plain <code>.md</code> files on your disk — no server, no account, no lock-in.
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-2b2e3b?logo=electron&logoColor=9FEAF9" />
  <img alt="React" src="https://img.shields.io/badge/React-20232a?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-110%20passing-3fb950" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-9184d9" />
</p>

---

## Features

**Editing**
- Tabbed [CodeMirror 6](https://codemirror.net) editor with a Markdown formatting toolbar
- Debounced auto-save with **atomic writes** (a crash mid-save never truncates a note)
- Native **spell check**, **image paste / drag-and-drop** (saved to `assets/`, auto-linked)

**Preview**
- Live GFM preview (tables, task lists, strikethrough), sanitized against XSS
- **Line-mapped** bidirectional scroll & selection sync between editor and preview
- **Mermaid** diagrams rendered from ` ```mermaid ` blocks

**Vault & files**
- Open any folder as a vault; VS Code–style collapsible tree with **favorites** and file-type icons
- Create / rename / delete (to OS trash), reopen your last vault on launch
- Live reconciliation when files change on disk (external edits, sync tools)

**Import / export**
- Export to **PDF**; import from **Word (.docx)** and **CSV/TSV** (also paste & view CSV as tables)

**Appearance**
- Light / dark, preset editor themes (One Dark, Dracula, Solarized…), custom colors, and fonts

**Git source control** *(optional)*
- Status badges in the tree, a Source Control panel (stage / commit / push / pull), diff & history

## Tech stack

Electron · React · Vite · TypeScript · Tailwind CSS v4 · CodeMirror 6 · unified/remark/rehype · simple-git · Mermaid · Vitest

## Getting started

```bash
npm install      # install dependencies
npm run dev      # launch the app (electron-vite dev)
```

Then use **Open Vault…** to point Notula at a folder of Markdown files.

## Scripts

```bash
npm run build      # production build (electron-vite)
npm test           # run the unit tests (Vitest)
npm run coverage   # tests with a coverage report
npm run typecheck  # TypeScript checks (main + renderer)
```

## Project layout

```
src/
├── main/       Electron main process — fs, watcher, PDF, DOCX, git, IPC
├── preload/    contextBridge: the narrow, validated window.api surface
├── renderer/   React UI — editor, preview, file tree, source control
└── shared/     Types + pure logic shared across processes (csv, git, …)
```

The renderer never touches Node directly; every filesystem and git operation
crosses a narrow, path-validated IPC boundary in the main process.

## Testing

110 unit tests (Vitest), ~90% coverage on core logic — CSV/git parsing, the
Markdown pipeline, the buffer/tab reducer, vault path validation, and the file
tree components.

## License

MIT
