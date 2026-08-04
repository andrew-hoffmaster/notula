/**
 * CSV/TSV ↔ Markdown table conversion. Pure, dependency-free, and shared by the
 * main process (file import) and the renderer (paste + preview of `.csv`).
 *
 * The parser follows RFC 4180: double-quoted fields, `""` escapes a quote, and
 * delimiters/newlines inside quotes are literal.
 */

/** Guess the delimiter from the first line: tab if it out-counts commas. */
export function detectDelimiter(text: string): ',' | '\t' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return tabs > commas ? '\t' : ','
}

/** Parse CSV/TSV text into a grid of string cells. */
export function parseCsv(text: string, delimiter: string = detectDelimiter(text)): string[][] {
  const s = text.replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  row.push(field)
  rows.push(row)

  // Drop a trailing empty row produced by a final newline.
  const last = rows[rows.length - 1]
  if (rows.length > 1 && last.length === 1 && last[0] === '') rows.pop()
  return rows
}

/** Escape a cell for use inside a Markdown table. */
function escapeCell(cell: string): string {
  return cell.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()
}

/**
 * Convert CSV/TSV text into a GFM Markdown table (first row = header). Rows are
 * padded to the widest row so ragged input still produces a valid table.
 */
export function csvToMarkdownTable(text: string): string {
  const rows = parseCsv(text)
  if (rows.length === 0 || (rows.length === 1 && rows[0].length === 1 && rows[0][0] === '')) {
    return ''
  }
  const cols = Math.max(...rows.map((r) => r.length))
  const grid = rows.map((r) => {
    const padded = [...r]
    while (padded.length < cols) padded.push('')
    return padded.map(escapeCell)
  })
  const toLine = (cells: string[]) => `| ${cells.join(' | ')} |`
  const separator = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`
  return [toLine(grid[0]), separator, ...grid.slice(1).map(toLine)].join('\n') + '\n'
}

/**
 * Heuristic for auto-converting pasted text: at least two rows, two columns, and
 * a delimiter count that's identical on every line. Conservative on purpose so
 * ordinary prose with commas is never mistaken for a table.
 */
export function looksLikeTable(text: string): boolean {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.length > 0)
  if (lines.length < 2) return false
  const delimiter = detectDelimiter(text)
  const counts = lines.map((l) => l.split(delimiter).length)
  const cols = counts[0]
  if (cols < 2 || !counts.every((c) => c === cols)) return false
  // A single comma is common in prose, so require ≥3 comma columns; a tab is a
  // strong tabular signal (spreadsheet copy) and is trusted at 2 columns.
  return delimiter === '\t' || cols >= 3
}
