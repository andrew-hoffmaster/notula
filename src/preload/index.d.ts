/** Ambient declaration so the renderer sees the typed `window.api` surface. */
import type { Api } from '../shared/types.js'

declare global {
  interface Window {
    api: Api
  }
}

export {}
