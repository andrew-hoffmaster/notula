# Changelog

All notable changes to Notula are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] — 2026-08-04

### Added
- In-app **PDF viewing** — `.pdf` files open in Chromium's built-in viewer via a
  vault-scoped `notula-file://` protocol.
- **About** dialog (Help → About Notula) showing app version and build info.
- **Auto-update** via electron-updater (Windows/macOS/Linux AppImage).
- **Native application menu** with accelerators, and persistent logging.
- Production hardening: crash-recovery error boundary, flush-on-quit, ESLint +
  Prettier, and a CI workflow (lint/typecheck/tests).

### Fixed
- External links in the preview now open in the default browser instead of
  navigating the app window away from the document.

## [0.1.0] — 2026-08-04

Initial release.

### Added
- Vault-based editing: open any folder of `.md` files; collapsible file tree
  with favorites and file-type icons.
- Tabbed CodeMirror editor with a formatting toolbar, debounced auto-save
  (atomic writes), spell check, and image paste / drag-and-drop.
- Live sanitized GFM preview with line-mapped bidirectional scroll & selection
  sync, and **Mermaid** diagram rendering.
- Export to **PDF**; import from **Word (.docx)** and **CSV/TSV** (plus CSV paste
  and view-as-table).
- Deep theming: light/dark, preset editor themes, custom colors, and fonts, in a
  VS Code–style shell (activity bar, source control view).
- **Git source control**: status badges, stage/commit/push/pull, diff & history.
- Reopen last vault on launch; external-change reconciliation.

[Unreleased]: https://github.com/andrew-hoffmaster/notula/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/andrew-hoffmaster/notula/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/andrew-hoffmaster/notula/releases/tag/v0.1.0
