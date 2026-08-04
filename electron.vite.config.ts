import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// electron-vite bundles the three Electron surfaces (main, preload, renderer)
// from one config. Renderer is a plain React SPA per the design doc (§2).
export default defineConfig({
  main: {
    // Bundle chokidar (+ its transitive deps) rather than externalizing it:
    // externalized, Electron's ESM loader trips on a CJS transitive dep at
    // runtime ("Cannot read properties of undefined (reading 'exports')").
    plugins: [externalizeDepsPlugin({ exclude: ['chokidar'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
