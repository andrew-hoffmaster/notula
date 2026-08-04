/**
 * Word (.docx) import helpers (design §7).
 *
 *   .docx → mammoth → HTML → turndown (+ GFM) → Markdown
 *
 * mammoth maps Word's *semantic* styles (Heading 1, List Bullet) rather than
 * chasing raw formatting, which is exactly what Markdown wants. Embedded images
 * are written to the vault's `assets/` folder with content-hashed names and
 * referenced by relative path so the vault stays portable.
 */
import crypto from 'node:crypto'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import mammoth from 'mammoth'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

/** Map an image MIME type to a file extension. */
export function extForContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff'
  }
  return map[contentType.toLowerCase()] ?? 'png'
}

/**
 * Content-hashed asset filename, e.g. `img-a1b2c3d4.png`. Hashing the bytes
 * means the same embedded image imported twice collapses to one file.
 */
export function assetFilename(data: Buffer, ext: string): string {
  const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 8)
  return `img-${hash}.${ext}`
}

/**
 * Validate the import target is a real `.docx`. mammoth handles the modern
 * OOXML format only — legacy `.doc` fails with a cryptic error, so reject it
 * up front (design §7).
 */
export function validateDocxExt(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.doc') {
    throw new Error('Legacy .doc files are not supported — save as .docx and retry.')
  }
  if (ext !== '.docx') {
    throw new Error(`Not a .docx file: ${path.basename(filePath)}`)
  }
}

/** Convert an HTML fragment to GFM Markdown. */
export function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  })
  turndown.use(gfm)
  return turndown.turndown(html)
}

/** Result of importing a `.docx`. */
export interface DocxImportResult {
  /** Converted Markdown. */
  markdown: string
  /** Vault-relative paths of images written to `assets/`. */
  assets: string[]
  /** Human-readable fidelity warnings from mammoth (unsupported features). */
  warnings: string[]
}

/**
 * Convert a `.docx` at `docxPath` into Markdown, extracting embedded images
 * into `<vaultRoot>/assets/` with content-hashed names.
 */
export async function convertDocx(docxPath: string, vaultRoot: string): Promise<DocxImportResult> {
  validateDocxExt(docxPath)

  const assets = new Set<string>()
  const assetsDir = path.join(vaultRoot, 'assets')

  const convertImage = mammoth.images.imgElement(async (image) => {
    const data = await image.read()
    const ext = extForContentType(image.contentType)
    const name = assetFilename(data, ext)
    await fs.mkdir(assetsDir, { recursive: true })
    await fs.writeFile(path.join(assetsDir, name), data)
    const rel = `assets/${name}`
    assets.add(rel)
    return { src: rel }
  })

  const { value: html, messages } = await mammoth.convertToHtml(
    { path: docxPath },
    { convertImage }
  )

  return {
    markdown: htmlToMarkdown(html),
    assets: [...assets],
    warnings: messages.filter((m) => m.type === 'warning').map((m) => m.message)
  }
}
