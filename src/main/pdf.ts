/**
 * PDF export helpers (design §6).
 *
 * The HTML wrapper is separated from the Electron print call so the
 * print-CSS/document-structure logic can be unit tested without a window.
 */
import { pathToFileURL } from 'node:url'

/**
 * Print stylesheet. `break-inside: avoid` keeps fenced code, tables, and
 * blockquotes from being split across a page boundary — Chromium will
 * otherwise slice a code block in half (design §6).
 */
const PRINT_CSS = `
  @page { margin: 0; }
  body {
    font: 14px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #111;
    margin: 0;
    padding: 0;
  }
  .content { padding: 0 8px; }
  pre, table, blockquote, figure, img { break-inside: avoid; }
  pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #d0d7de; padding: 4px 8px; }
  img { max-width: 100%; }
`

/**
 * Wrap sanitized preview HTML into a full, self-contained print document.
 *
 * `vaultRoot` becomes a `<base href>` so vault-relative image paths resolve
 * against the vault regardless of where the temp file lives.
 */
export function buildPrintHtml(bodyHtml: string, vaultRoot: string): string {
  // Ensure a trailing slash so the base URL is treated as a directory.
  const base = pathToFileURL(vaultRoot.endsWith('/') ? vaultRoot : vaultRoot + '/').href
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<base href="${base}">
<style>${PRINT_CSS}</style>
</head>
<body><div class="content">${bodyHtml}</div></body>
</html>`
}

/**
 * Browser-side script awaited before `printToPDF`: fonts and images must be
 * fully loaded or the output intermittently uses fallback fonts / drops
 * images (design §6).
 */
export const WAIT_FOR_ASSETS = `(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) =>
    img.complete ? null : new Promise((res) => { img.onload = img.onerror = res; })
  ));
})()`
