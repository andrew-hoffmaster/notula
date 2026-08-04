/**
 * File-type icon for tree rows (VS Code style). Monochrome (`currentColor`) so
 * it inherits the row's muted→ink color rather than introducing off-brand hues.
 */
import { FileText, Image, Table2 } from 'lucide-react'

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'])

interface FileIconProps {
  /** File name (used for its extension). */
  name: string
  className?: string
}

export default function FileIcon({ name, className }: FileIconProps): React.JSX.Element {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()

  if (ext === 'md' || ext === 'markdown') {
    // The Markdown mark (rounded frame + "M▾"), the recognizable file badge.
    return (
      <svg viewBox="0 0 208 128" width="15" height="15" className={className} aria-hidden>
        <rect
          x="5"
          y="5"
          width="198"
          height="118"
          rx="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
        />
        <path
          fill="currentColor"
          d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm145 0l-30-33h20V30h20v35h20z"
        />
      </svg>
    )
  }

  if (ext === 'csv' || ext === 'tsv') return <Table2 size={15} strokeWidth={1.75} className={className} />
  if (IMAGE_EXT.has(ext)) return <Image size={15} strokeWidth={1.75} className={className} />
  return <FileText size={15} strokeWidth={1.75} className={className} />
}
