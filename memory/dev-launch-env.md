---
name: dev-launch-env
description: How to launch the Notula Electron app in this sandbox; ELECTRON_RUN_AS_NODE gotcha
metadata:
  type: project
---

Running `npm run dev` (electron-vite) in this environment fails with either an
ESM `cjsPreparseModuleExports` TypeError or `electron.app` undefined, because
the shell sets `ELECTRON_RUN_AS_NODE=1`, which forces Electron to run headless
as plain Node (so `require('electron')` returns a path string, no GUI).

**Fix:** clear the var before launching, e.g. `env -u ELECTRON_RUN_AS_NODE npm run dev`,
and spawn detached (PowerShell `Start-Process`) so the window survives the tool call —
a backgrounded Bash task reaps its child window when it ends.

Main/preload build as CommonJS (no `"type":"module"` in package.json): sandboxed
preload cannot be ESM, and ESM Electron main is fragile here. Preload output is
`out/preload/index.js`, referenced from main.
