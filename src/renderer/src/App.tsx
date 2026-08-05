/**
 * Root component: vault picker, sidebar tree, tabbed CodeMirror editor with
 * debounced auto-save (design M1 + §9 auto-save = debounce timer).
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { FileNode, VaultInfo } from '@shared/types.js'
import {
  activeBuffer,
  buffersReducer,
  initialBuffersState,
  resolveExternalChange,
  type BuffersState
} from './buffers.js'
import { renderMarkdown } from './markdown.js'
import {
  collectFilePaths,
  existingFavorites,
  loadList,
  saveList,
  storageKey,
  toggle,
  uniqueMarkdownName
} from './treeState.js'
import {
  activeColors,
  applyChrome,
  fontStack,
  loadAppearance,
  saveAppearance,
  type Appearance
} from './appearance.js'
import logoMark from './assets/logo-mark.svg'
import Editor, { type EditorHandle } from './components/Editor.js'
import FileTree from './components/FileTree.js'
import Preview, { type PreviewHandle } from './components/Preview.js'
import Tabs from './components/Tabs.js'
import ContextMenu from './components/ContextMenu.js'
import SettingsModal from './components/SettingsModal.js'
import Toolbar from './components/Toolbar.js'
import HelpModal from './components/HelpModal.js'
import Welcome from './components/Welcome.js'
import FileIcon from './components/FileIcon.js'
import SourceControl from './components/SourceControl.js'
import DiffModal from './components/DiffModal.js'
import HistoryModal from './components/HistoryModal.js'
import ActivityBar, { type SidebarView } from './components/ActivityBar.js'
import { useGit } from './useGit.js'
import { classify, type ChangeClass } from '@shared/git.js'
import { FileDown, FilePlus, FileUp, FolderOpen, FolderPlus, Star } from 'lucide-react'

/** Delay after the last keystroke before auto-saving a buffer to disk. */
const AUTOSAVE_MS = 1000

export default function App(): React.JSX.Element {
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [tree, setTree] = useState<FileNode[]>([])
  const [state, dispatch] = useReducer(buffersReducer, initialBuffersState)
  // Starred files and expanded folders (relative paths), persisted per vault.
  const [favorites, setFavorites] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  // Editor appearance (theme, fonts, custom colors), restored from storage.
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  // Git: sidebar view, diff/history modals, and live status for the open vault.
  const [sidebarView, setSidebarView] = useState<SidebarView>('files')
  const [diffModal, setDiffModal] = useState<{ title: string; diff: string } | null>(null)
  const [historyPath, setHistoryPath] = useState<string | null>(null)
  const { status: gitStatus, refresh: refreshGit } = useGit(vault ? vault.root : null)
  const gitRefreshRef = useRef(refreshGit)
  gitRefreshRef.current = refreshGit
  const gitBadges = useMemo(() => {
    const m = new Map<string, ChangeClass>()
    for (const c of gitStatus.changes) m.set(c.path, classify(c.index, c.working))
    return m
  }, [gitStatus])

  // Open a diff for a path (working, staged, or a commit). Untracked files have
  // no git diff, so synthesize an all-added view from their content.
  const openDiff = useCallback(
    async (path: string, opts: { staged?: boolean; commit?: string } = {}) => {
      let d = await window.api.git.diff(path, opts)
      if (!d && !opts.commit) {
        try {
          const content = await window.api.file.read(path)
          d = content ? content.split('\n').map((l) => `+${l}`).join('\n') : ''
        } catch {
          /* file may be deleted */
        }
      }
      setDiffModal({ title: path + (opts.staged ? '  (staged)' : ''), diff: d })
    },
    []
  )
  useEffect(() => {
    applyChrome(appearance)
    saveAppearance(appearance)
  }, [appearance])
  // Per-file debounce timers, keyed by relPath.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // Editor/preview scroll panes, kept in sync bidirectionally (design §5).
  const previewRef = useRef<PreviewHandle>(null)
  const editorRef = useRef<EditorHandle>(null)
  // One-shot guards: a programmatic scroll on one pane sets the other's flag so
  // the scroll event it triggers doesn't echo back and cause a feedback loop.
  const ignoreEditor = useRef(false)
  const ignorePreview = useRef(false)

  // Adopt an opened/restored vault: reset open tabs, load its tree and state.
  const adoptVault = useCallback(async (info: VaultInfo) => {
    dispatch({ type: 'reset' })
    setVault(info)
    setTree(await window.api.vault.list())
    setFavorites(loadList(storageKey('favs', info.root)))
    setExpanded(loadList(storageKey('expanded', info.root)))
  }, [])

  const openVault = useCallback(async () => {
    // Persist any in-flight edits to the current vault before switching.
    await flushPendingSaves()
    const info = await window.api.vault.open()
    if (info) await adoptVault(info)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adoptVault])

  // On launch, reopen the last vault (restored in main) without re-prompting.
  useEffect(() => {
    window.api.vault.current().then((info) => {
      if (info) adoptVault(info)
    })
  }, [adoptVault])

  const toggleFavorite = useCallback((p: string) => setFavorites((f) => toggle(f, p)), [])
  const toggleExpand = useCallback((p: string) => setExpanded((e) => toggle(e, p)), [])

  // Open right-click context menu for a tree node.
  const [menu, setMenu] = useState<{ node: FileNode; x: number; y: number } | null>(null)
  const [importMenu, setImportMenu] = useState<{ x: number; y: number } | null>(null)

  const refreshTree = useCallback(async () => {
    setTree(await window.api.vault.list())
  }, [])

  const newNote = useCallback(async () => {
    const name = window.prompt('New note name')?.trim()
    if (!name) return
    const base = name.replace(/\.md$/i, '')
    const relPath = uniqueMarkdownName(base, collectFilePaths(treeRef.current))
    const content = `# ${base}\n\n`
    await window.api.file.create(relPath, content)
    await refreshTree()
    dispatch({ type: 'open', relPath, name: relPath, content })
  }, [refreshTree])

  const newFolder = useCallback(async () => {
    const name = window.prompt('New folder name')?.trim()
    if (!name) return
    await window.api.file.createFolder(name)
    await refreshTree()
    setExpanded((e) => (e.includes(name) ? e : [...e, name]))
  }, [refreshTree])

  const renameEntry = useCallback(
    async (node: FileNode) => {
      const to = window.prompt('Rename to', node.name)?.trim()
      if (!to || to === node.name) return
      const parent = node.relPath.split('/').slice(0, -1).join('/')
      const toRel = parent ? `${parent}/${to}` : to
      await window.api.file.rename(node.relPath, toRel)
      await refreshTree()
      if (!node.isDir) dispatch({ type: 'rename', from: node.relPath, to: toRel, name: to })
      setFavorites((f) => f.map((p) => (p === node.relPath ? toRel : p)))
    },
    [refreshTree]
  )

  const deleteEntry = useCallback(
    async (node: FileNode) => {
      if (!window.confirm(`Move "${node.name}" to trash?`)) return
      await window.api.file.delete(node.relPath)
      await refreshTree()
      dispatch({ type: 'close', relPath: node.relPath })
      setFavorites((f) => f.filter((p) => p !== node.relPath))
    },
    [refreshTree]
  )

  // Persist tree state whenever it changes for the open vault.
  useEffect(() => {
    if (vault) saveList(storageKey('favs', vault.root), favorites)
  }, [favorites, vault])
  useEffect(() => {
    if (vault) saveList(storageKey('expanded', vault.root), expanded)
  }, [expanded, vault])

  const openFile = useCallback(
    async (relPath: string) => {
      const content = await window.api.file.read(relPath)
      const name = relPath.split('/').pop() ?? relPath
      dispatch({ type: 'open', relPath, name, content })
    },
    []
  )

  // Debounced auto-save: reset the timer on each edit, persist when it fires.
  const onEdit = useCallback((relPath: string, content: string) => {
    dispatch({ type: 'edit', relPath, content })
    const existing = timers.current.get(relPath)
    if (existing) clearTimeout(existing)
    timers.current.set(
      relPath,
      setTimeout(async () => {
        timers.current.delete(relPath)
        await window.api.file.write(relPath, content)
        dispatch({ type: 'saved', relPath })
      }, AUTOSAVE_MS)
    )
  }, [])

  // Flush any pending timers if the component unmounts.
  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  // Latest state/tree for use inside async callbacks without re-subscribing.
  const stateRef = useRef(state)
  stateRef.current = state
  const treeRef = useRef(tree)
  treeRef.current = tree

  // Force-save the active buffer now, cancelling its pending debounce timer.
  const saveActive = useCallback(async () => {
    const buf = stateRef.current.buffers[stateRef.current.active]
    if (!buf || !buf.dirty) return
    const t = timers.current.get(buf.relPath)
    if (t) {
      clearTimeout(t)
      timers.current.delete(buf.relPath)
    }
    await window.api.file.write(buf.relPath, buf.content)
    dispatch({ type: 'saved', relPath: buf.relPath })
  }, [])

  const closeActive = useCallback(() => {
    const buf = stateRef.current.buffers[stateRef.current.active]
    if (buf) dispatch({ type: 'close', relPath: buf.relPath })
  }, [])

  // Cancel debounce timers and write every dirty buffer now — used before
  // switching vaults so pending edits aren't lost or written to the new root.
  const flushPendingSaves = useCallback(async () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current.clear()
    const dirty = stateRef.current.buffers.filter((b) => b.dirty)
    await Promise.all(dirty.map((b) => window.api.file.write(b.relPath, b.content)))
  }, [])

  // Persist a pasted/dropped image into the vault; returns its relative path.
  const saveImage = useCallback(async (bytes: ArrayBuffer, contentType: string) => {
    const rel = await window.api.file.saveImage(new Uint8Array(bytes), contentType)
    await refreshTree()
    return rel
  }, [refreshTree])

  // Native-menu actions (accelerators live on the menu, not a keydown listener).
  useEffect(() => {
    const actions: Record<string, () => void> = {
      'new-note': newNote,
      'new-folder': newFolder,
      'open-vault': openVault,
      save: saveActive,
      'close-tab': closeActive,
      help: () => setShowHelp(true),
      settings: () => setShowSettings(true)
    }
    return window.api.app.onMenu((action) => actions[action]?.())
  }, [newNote, newFolder, openVault, saveActive, closeActive])

  // Persist unsaved edits when the window is about to close.
  useEffect(() => {
    window.api.app.onBeforeClose(() => flushPendingSaves())
  }, [flushPendingSaves])

  // Create and open a new note from imported Markdown (a collision-free name).
  const openImported = useCallback(async (name: string, markdown: string): Promise<string> => {
    const relPath = uniqueMarkdownName(name, collectFilePaths(treeRef.current))
    await window.api.file.create(relPath, markdown)
    setTree(await window.api.vault.list())
    dispatch({ type: 'open', relPath, name: relPath, content: markdown })
    return relPath
  }, [])

  // Import a Word document into a new vault note (design §7).
  const importDocx = useCallback(async () => {
    const res = await window.api.import.docx()
    if (!res) return
    const relPath = await openImported(res.name, res.markdown)
    if (res.warnings.length > 0) {
      // ponytail: post-import alert rather than a pre-import fidelity dialog;
      // upgrade to a richer dialog (design §7 fidelity table) if users miss it.
      window.alert(
        `Imported "${relPath}".\n\nSome Word features did not convert:\n` +
          res.warnings.slice(0, 10).join('\n')
      )
    }
  }, [openImported])

  // Import a CSV/TSV file into a new note as a Markdown table.
  const importCsv = useCallback(async () => {
    const res = await window.api.import.csv()
    if (res) await openImported(res.name, res.markdown)
  }, [openImported])

  // External-change policy (design §4): react to on-disk edits from other apps.
  useEffect(() => {
    return window.api.vault.onChange(async (evt) => {
      // Any change may alter git status (badges + SC panel).
      gitRefreshRef.current()
      // Adds/removes reshape the tree.
      if (evt.kind !== 'change') setTree(await window.api.vault.list())
      if (evt.kind === 'unlink') return

      const buf = stateRef.current.buffers.find((b) => b.relPath === evt.relPath)
      if (!buf) return

      const disk = await window.api.file.read(evt.relPath)
      const decision = resolveExternalChange(buf, disk)
      if (decision === 'ignore') return
      if (decision === 'reload') {
        dispatch({ type: 'reload', relPath: evt.relPath, content: disk })
        return
      }
      // ponytail: two-way confirm instead of a diff view; add "open diff"
      // (design §4) when the raw prompt proves too blunt in practice.
      const takeTheirs = window.confirm(
        `"${buf.name}" changed on disk.\n\n` +
          'OK = load the on-disk version (discard your unsaved edits)\n' +
          'Cancel = keep your version'
      )
      if (takeTheirs) dispatch({ type: 'reload', relPath: evt.relPath, content: disk })
    })
  }, [])

  // Export the active note to PDF via the hidden print window (design §6).
  const [exporting, setExporting] = useState(false)
  const exportPdf = useCallback(async () => {
    const buf = stateRef.current.buffers[stateRef.current.active]
    if (!buf) return
    setExporting(true)
    try {
      await window.api.export.pdf(renderMarkdown(buf.content), {
        title: buf.name.replace(/\.md$/i, '')
      })
    } finally {
      setExporting(false)
    }
  }, [])

  // Line-mapped scroll sync. A programmatic scroll on one pane sets the other's
  // one-shot guard so the scroll event it triggers doesn't echo back.
  const onEditorScroll = useCallback((topLine: number) => {
    if (ignoreEditor.current) {
      ignoreEditor.current = false
      return
    }
    ignorePreview.current = true
    previewRef.current?.scrollToLine(topLine)
  }, [])

  const onPreviewScrollLine = useCallback((topLine: number) => {
    if (ignorePreview.current) {
      ignorePreview.current = false
      return
    }
    ignoreEditor.current = true
    editorRef.current?.scrollToLine(topLine)
  }, [])

  // Source line of the editor cursor, mirrored as a highlighted preview block.
  const [activeLine, setActiveLine] = useState(1)

  const current = activeBuffer(state)
  const favSet = new Set(favorites)
  const expandedSet = new Set(expanded)
  const favFiles = existingFavorites(favorites, tree)

  if (!vault) {
    return <Welcome onOpen={openVault} />
  }

  return (
    <div className="flex h-full bg-app text-ink">
      <ActivityBar
        view={sidebarView}
        onView={(v) => {
          setSidebarView(v)
          if (v === 'scm') refreshGit()
        }}
        gitChanges={gitStatus.changes.length}
        onHelp={() => setShowHelp(true)}
        onSettings={() => setShowSettings(true)}
      />
      <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-line bg-panel">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <img src={logoMark} alt="" className="h-4 w-4 dark:invert" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
            {vault.name}
          </span>
          <button onClick={openVault} title="Open / switch vault" className="icon-btn">
            <FolderOpen size={15} strokeWidth={1.75} />
          </button>
          <button onClick={newNote} title="New note" className="icon-btn">
            <FilePlus size={15} strokeWidth={1.75} />
          </button>
          <button onClick={newFolder} title="New folder" className="icon-btn">
            <FolderPlus size={15} strokeWidth={1.75} />
          </button>
        </div>

        {sidebarView === 'scm' ? (
          <SourceControl status={gitStatus} onRefresh={refreshGit} onOpenDiff={openDiff} />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto pb-2">
          {favFiles.length > 0 && (
            <div className="mb-1 border-b border-line pb-1">
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
                Favorites
              </div>
              {favFiles.map((relPath) => (
                <div key={relPath} data-active={relPath === current?.relPath} className="row group">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pl-3 text-left text-[13px]"
                    onClick={() => openFile(relPath)}
                  >
                    <FileIcon name={relPath} className="shrink-0 text-faint" />
                    <span className="truncate">{relPath.split('/').pop() ?? relPath}</span>
                  </button>
                  <button
                    className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-accent"
                    aria-label={`Unstar ${relPath}`}
                    onClick={() => toggleFavorite(relPath)}
                  >
                    <Star size={13} strokeWidth={2} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <FileTree
            nodes={tree}
            activePath={current?.relPath ?? null}
            expanded={expandedSet}
            favorites={favSet}
            gitBadges={gitBadges}
            onOpen={openFile}
            onToggleExpand={toggleExpand}
            onToggleFavorite={toggleFavorite}
            onContextMenu={(node, x, y) => setMenu({ node, x, y })}
          />
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-stretch border-b border-line bg-panel">
          <div className="min-w-0 flex-1">
            <Tabs
              buffers={state.buffers}
              active={state.active}
              onActivate={(relPath) => dispatch({ type: 'activate', relPath })}
              onClose={(relPath) => dispatch({ type: 'close', relPath })}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 px-2">
            <button
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setImportMenu({ x: r.left, y: r.bottom + 4 })
              }}
              className="btn"
              title="Import a document"
            >
              <FileUp size={14} strokeWidth={1.75} />
              Import
            </button>
            <button onClick={exportPdf} disabled={!current || exporting} className="btn">
              <FileDown size={14} strokeWidth={1.75} />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {current ? (
            <div className="flex h-full">
              <div className="flex min-w-0 flex-1 flex-col border-r border-line">
                <Toolbar onFormat={(kind) => editorRef.current?.format(kind)} />
                <div className="min-h-0 flex-1">
                  <Editor
                    ref={editorRef}
                    docKey={current.relPath}
                    value={current.content}
                    onChange={(content) => onEdit(current.relPath, content)}
                    onScroll={onEditorScroll}
                    onCursorLine={setActiveLine}
                    onSaveImage={saveImage}
                    colors={activeColors(appearance)}
                    fontFamily={fontStack(appearance)}
                    fontSize={appearance.fontSize}
                    lineHeight={appearance.lineHeight}
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <Preview
                  ref={previewRef}
                  value={current.content}
                  baseDir={current.relPath.split('/').slice(0, -1).join('/')}
                  background={activeColors(appearance).bg}
                  asCsv={/\.(csv|tsv)$/i.test(current.relPath)}
                  dark={activeColors(appearance).dark}
                  activeLine={activeLine}
                  onScrollLine={onPreviewScrollLine}
                  onSelectLine={(line) => editorRef.current?.setCursorLine(line)}
                  onSelectRange={(from, to, text) =>
                    editorRef.current?.selectLines(from, to, text)
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-faint">
              <img src={logoMark} alt="" className="h-8 w-8 opacity-40 dark:invert" />
              <p className="text-sm">Select a note to start writing</p>
            </div>
          )}
        </div>
      </main>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            ...(gitStatus.isRepo && !menu.node.isDir
              ? [
                  { label: 'View changes', action: () => openDiff(menu.node.relPath, {}) },
                  { label: 'History…', action: () => setHistoryPath(menu.node.relPath) }
                ]
              : []),
            { label: 'Rename…', action: () => renameEntry(menu.node) },
            { label: 'Delete', danger: true, action: () => deleteEntry(menu.node) }
          ]}
        />
      )}

      {importMenu && (
        <ContextMenu
          x={importMenu.x}
          y={importMenu.y}
          onClose={() => setImportMenu(null)}
          items={[
            { label: 'Word document (.docx)…', action: importDocx },
            { label: 'CSV / TSV (.csv)…', action: importCsv }
          ]}
        />
      )}

      {showSettings && (
        <SettingsModal
          appearance={appearance}
          onChange={setAppearance}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {diffModal && (
        <DiffModal
          title={diffModal.title}
          diff={diffModal.diff}
          onClose={() => setDiffModal(null)}
        />
      )}

      {historyPath && (
        <HistoryModal path={historyPath} onClose={() => setHistoryPath(null)} />
      )}
    </div>
  )
}

// Re-exported for tests that need the state type without importing internals.
export type { BuffersState }
