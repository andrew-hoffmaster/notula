import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Unit tests target the pure, security-critical logic (vault path validation,
// atomic writes, tab reducer) — no Electron or DOM required.
export default defineConfig({
  resolve: {
    alias: { '@shared': resolve('src/shared') }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      // istanbul, not v8: on Windows the v8 provider double-counted each source
      // file (a phantom 0% row per file) after the CJS build switch, halving
      // the reported totals. istanbul dedupes by resolved path.
      provider: 'istanbul',
      include: [
        'src/shared/csv.ts',
        'src/shared/git.ts',
        'src/main/vault.ts',
        'src/main/pdf.ts',
        'src/main/docx.ts',
        'src/main/settings.ts',
        'src/renderer/src/buffers.ts',
        'src/renderer/src/markdown.ts',
        'src/renderer/src/treeState.ts',
        'src/renderer/src/appearance.ts'
      ],
      // Component .tsx files are exercised by tests but excluded from the count:
      // istanbul can't instrument JSX under Vite's React transform (reads 0%).
      excludeNodeModules: true,
      thresholds: { lines: 50, functions: 50, branches: 50, statements: 50 }
    }
  }
})
