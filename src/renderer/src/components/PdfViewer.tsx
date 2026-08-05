/**
 * In-app PDF viewer: embeds Chromium's built-in PDF viewer, fed by the
 * vault-scoped `notula-file://` protocol (served with `application/pdf`).
 */
interface PdfViewerProps {
  /** Vault-relative path to the `.pdf`. */
  relPath: string
}

export default function PdfViewer({ relPath }: PdfViewerProps): React.JSX.Element {
  const src = `notula-file://vault/${relPath.split('/').map(encodeURIComponent).join('/')}`
  return (
    <embed src={src} type="application/pdf" title={relPath} className="h-full w-full bg-app" />
  )
}
