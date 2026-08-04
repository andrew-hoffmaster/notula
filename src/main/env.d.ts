/** electron-vite copies `?asset` imports to the build output and yields the path. */
declare module '*?asset' {
  const src: string
  export default src
}

/** turndown-plugin-gfm ships no types; it exports a `gfm` turndown plugin. */
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown'
  export const gfm: TurndownService.Plugin
  export const tables: TurndownService.Plugin
  export const strikethrough: TurndownService.Plugin
  export const taskListItems: TurndownService.Plugin
}
