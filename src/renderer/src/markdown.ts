/**
 * Markdown → sanitized HTML pipeline (design §5).
 *
 *   markdown → remark-parse → remark-gfm → remark-rehype → rehype-raw
 *            → (rewrite vault images) → rehype-sanitize → rehype-stringify
 *
 * Returns an HTML *string* rather than React nodes on purpose: the same output
 * feeds the preview pane and the hidden print window for PDF export (design §6).
 * `rehype-sanitize` is mandatory — the app renders user-authored Markdown that
 * may embed HTML, and the renderer must never trust it (§3).
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

/** Custom scheme served by the main process from inside the open vault. */
export const IMAGE_SCHEME = 'notula-img'

/**
 * Resolve a Markdown image `src` (relative to the note at `baseDir`) to a
 * POSIX vault-relative path, or `null` if it is an external URL (http, data,
 * …) or escapes the vault. Vault dirs use `/` separators throughout.
 */
export function resolveImageSrc(baseDir: string, src: string): string | null {
  // Leave absolute URLs and protocol/scheme-relative refs untouched.
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return null

  const stack: string[] = []
  for (const part of (baseDir ? baseDir.split('/') : []).concat(src.split('/'))) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (stack.length === 0) return null // climbed out of the vault
      stack.pop()
    } else {
      stack.push(part)
    }
  }
  return stack.length ? stack.join('/') : null
}

/**
 * Extend the sanitize schema: allow `src` to use our image scheme, and allow a
 * `data-source-line` attribute on every element (for editor↔preview sync).
 */
const schema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), IMAGE_SCHEME]
  },
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'dataSourceLine']
  }
}

/**
 * rehype transform: stamp each top-level block with `data-source-line` (its
 * 1-based source line) so the editor and preview can align by line. Runs
 * *before* rehype-raw, which then serializes the attribute into the HTML it
 * reparses (rehype-raw discards node positions, but keeps real attributes).
 */
function addSourceLines() {
  return (tree: unknown) => {
    const root = tree as { children?: Array<Record<string, unknown>> }
    for (const node of root.children ?? []) {
      const line = (node.position as { start?: { line?: number } } | undefined)?.start?.line
      if (node.type === 'element' && typeof line === 'number') {
        node.properties = { ...(node.properties as object), dataSourceLine: line }
      }
    }
  }
}

/**
 * rehype transform: rewrite relative `<img src>` to `notula-img://vault/<path>`
 * so the main process can serve the bytes from the vault. Runs before sanitize.
 */
function rewriteVaultImages(baseDir: string) {
  const walk = (node: { tagName?: string; properties?: Record<string, unknown>; children?: unknown[] }): void => {
    if (node.tagName === 'img' && typeof node.properties?.src === 'string') {
      const rel = resolveImageSrc(baseDir, node.properties.src as string)
      if (rel) {
        const encoded = rel.split('/').map(encodeURIComponent).join('/')
        node.properties.src = `${IMAGE_SCHEME}://vault/${encoded}`
      }
    }
    for (const child of node.children ?? []) walk(child as typeof node)
  }
  return () => (tree: unknown) => walk(tree as Parameters<typeof walk>[0])
}

/**
 * Render Markdown to a sanitized HTML string. `baseDir` is the note's
 * vault-relative directory, used to resolve relative image paths.
 */
export function renderMarkdown(markdown: string, baseDir = ''): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // `allowDangerousHtml` + rehype-raw so sanitize (not silent stripping)
    // decides what embedded HTML is safe (design §3 threat model).
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(addSourceLines)
    .use(rehypeRaw)
    .use(rewriteVaultImages(baseDir))
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
  return processor.processSync(markdown).toString()
}
