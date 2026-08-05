# Contributing to Notula

Thanks for your interest! Notula is a local-first Markdown editor built with
Electron, React, and TypeScript. Contributions of all kinds are welcome — bug
reports, features, docs, and tests.

## Getting started

```bash
git clone https://github.com/andrew-hoffmaster/notula.git
cd notula
npm install
npm run dev      # launch the app with hot reload
```

## Before you open a PR

Run the same checks CI runs — all must pass:

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript (main + renderer)
npm test            # Vitest
npm run build       # production build
```

New or changed behavior should come with tests. Pure logic lives in
`src/shared` and `src/**/*.ts` (not components) and is unit-testable without a
DOM — that's the preferred place for anything with real logic.

## Architecture (the one rule)

The **renderer never touches Node directly.** All filesystem, git, PDF, and
DOCX work happens in the main process and crosses a narrow, path-validated IPC
surface (`window.api`, defined in `src/shared/types.ts`). Keeping Node-specific
code behind that surface is what keeps the app secure and portable.

- `src/main` — Electron main: fs, watcher, git, PDF, DOCX, IPC handlers
- `src/preload` — the `contextBridge` API surface
- `src/renderer` — React UI (editor, preview, file tree, source control)
- `src/shared` — types + pure logic shared across processes

## Style

- ESLint + Prettier are configured; run `npm run format` before committing.
- Match the surrounding code: doc comments on public APIs, comments explain
  *why* not *what*.

## Reporting bugs / requesting features

Use the issue templates. For bugs, include your OS, the version (Help → About
Notula), and steps to reproduce.

By contributing, you agree your contributions are licensed under the project's
[MIT License](LICENSE).
