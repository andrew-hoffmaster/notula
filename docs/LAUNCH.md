# Launch kit

Throwaway reference for promoting Notula. Delete or keep — it's not part of the
app. Fill in real numbers/links before posting.

## GitHub repo metadata

**Description** (Settings → paste at top of repo):

> A local-first, cross-platform Markdown editor. Plain .md files, live preview, Mermaid, PDF export, DOCX/CSV import, git — no account, no cloud, no lock-in.

**Topics** (Settings → topics):

```
markdown  markdown-editor  electron  react  typescript  note-taking
local-first  notes  obsidian-alternative  cross-platform  desktop-app  pdf  mermaid
```

Also enable **Discussions** and add a few `good first issue` labels.

## Screenshots to capture

Record on a small vault with real-looking notes. Light theme reads best on HN/PH.

1. **Hero** — editor + live preview side by side (the welcome note works). → `docs/screenshots/editor-preview.png`
2. **Mermaid** — a note with a `flowchart` rendered. → `docs/screenshots/mermaid.png`
3. **Source control** — the git panel with staged/unstaged changes + badges. → `docs/screenshots/source-control.png`
4. **Themes** — the Appearance dialog / a dark theme. → `docs/screenshots/themes.png`

**Demo GIF (most important):** 15–25s — open a vault, type Markdown, watch the
preview update, paste an image, show a Mermaid diagram, toggle a theme. Record
with [ScreenToGif](https://www.screentogif.com) (Windows) or Kap (macOS); keep it
under ~8 MB so it plays inline on GitHub. Put it at the top of the README.

## One-liner

> Your notes are just plain `.md` files on your disk — no account, no cloud, no lock-in. Free & open-source, cross-platform.

---

## Show HN (news.ycombinator.com)

**Title:**

```
Show HN: Notula – a local-first Markdown editor (Electron, MIT)
```

**Body:**

```
I built Notula, a desktop Markdown editor where a folder of plain .md files is
the source of truth — no server, no database, no account. It's MIT-licensed and
runs on Windows, macOS, and Linux.

Why another editor? I wanted Obsidian's "just files" model without the closed
core, Typora's polish without the price, and none of the cloud. Everything lives
on disk and works with any other tool.

Highlights:
- Live GFM preview with line-mapped scroll/selection sync and Mermaid diagrams
- Tabbed CodeMirror editor, atomic autosave, spell check, image paste
- PDF export; DOCX and CSV import
- Built-in git source control (status, stage/commit/push/pull, diff, history)
- Deep theming, VS Code-style shell, auto-update

The renderer never touches Node directly — all fs/git/PDF work crosses a narrow,
path-validated IPC boundary, which keeps the XSS-in-preview → RCE risk closed.

Repo + downloads: https://github.com/andrew-hoffmaster/notula
Happy to answer questions.
```

Post Tue–Thu, ~8–10am ET. Reply to every comment for the first few hours.

## Reddit (r/opensource, r/electronjs, r/coolgithubprojects, r/selfhosted)

**Title:**

```
Notula — a local-first, open-source Markdown editor (plain .md files, git built in)
```

**Body:**

```
Made a cross-platform Markdown editor where your notes are just plain .md files
on disk — no account, no cloud, no lock-in. MIT-licensed.

- Live preview (GFM + Mermaid), scroll/selection sync
- PDF export, DOCX/CSV import, image paste
- Built-in git: status badges, stage/commit/push/pull, diff & history
- Themes, spell check, auto-update; Windows/macOS/Linux

Downloads + source: https://github.com/andrew-hoffmaster/notula

Feedback very welcome — it's early (v0.1.x). What would make it your daily driver?
```

Check each subreddit's self-promotion rules first; lead with value, not just a link.

## Product Hunt

**Tagline (60 chars max):**

```
The Markdown editor where your notes are just files
```

**First comment:**

```
Hi PH! Notula is a local-first Markdown editor — your notes stay as plain .md
files on your disk, no account or cloud. Live preview with Mermaid, PDF export,
DOCX/CSV import, and git source control built in. Free, open-source (MIT),
cross-platform, and it updates itself. I'd love your feedback on what's missing.
```

## AlternativeTo.net

List as an alternative to **Obsidian**, **Typora**, **iA Writer**, **Mark Text**.

**Description:**

```
Notula is a free, open-source (MIT), local-first Markdown editor for Windows,
macOS, and Linux. Notes are plain .md files — no account, no cloud, no lock-in.
Features live GFM preview with Mermaid diagrams, PDF export, DOCX/CSV import,
built-in git source control, deep theming, and auto-update.
```

## Awesome-list PRs

Submit to: `awesome-electron`, `awesome-markdown`, `awesome-note-taking`, and
local-first lists. One line:

```
- [Notula](https://github.com/andrew-hoffmaster/notula) — Local-first Markdown editor; plain .md files, live preview, Mermaid, and built-in git. (MIT)
```
