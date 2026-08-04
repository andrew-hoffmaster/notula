/**
 * Appearance settings modal: editor theme, fonts, and custom colors.
 *
 * Emits a whole new {@link Appearance} on every change so the parent can apply
 * and persist it live (no Apply button).
 */
import { X } from 'lucide-react'
import { THEME_LABELS, type Appearance, type ColorSet } from '../appearance.js'

interface SettingsModalProps {
  appearance: Appearance
  onChange: (next: Appearance) => void
  onClose: () => void
}

/** Labels for the font-family dropdown. */
const FONT_LABELS: Array<[string, string]> = [
  ['sans', 'Sans-serif'],
  ['serif', 'Serif'],
  ['mono', 'Monospace']
]

/** The four editable custom-palette swatches. */
const COLOR_FIELDS: Array<[keyof ColorSet, string]> = [
  ['bg', 'Background'],
  ['fg', 'Text'],
  ['accent', 'Accent'],
  ['heading', 'Headings']
]

const FIELD =
  'w-full rounded-md border border-line bg-transparent px-2.5 py-1.5 text-ink outline-none transition focus:border-accent'
const LABEL = 'mb-1.5 block text-xs font-medium text-muted'

export default function SettingsModal({
  appearance,
  onChange,
  onClose
}: SettingsModalProps): React.JSX.Element {
  const set = (patch: Partial<Appearance>) => onChange({ ...appearance, ...patch })
  const isCustom = appearance.themeId === 'custom'

  return (
    <div className="backdrop flex items-center justify-center" onClick={onClose}>
      <div className="sheet w-[26rem] p-5 text-sm text-ink" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Appearance</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close settings">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <label className="mb-4 block">
          <span className={LABEL}>Editor theme</span>
          <select
            value={appearance.themeId}
            onChange={(e) => set({ themeId: e.target.value })}
            className={FIELD}
          >
            {THEME_LABELS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="col-span-2">
            <span className={LABEL}>Font</span>
            <select
              value={appearance.fontFamily}
              onChange={(e) => set({ fontFamily: e.target.value })}
              className={FIELD}
            >
              {FONT_LABELS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={LABEL}>Font size</span>
            <input
              type="number"
              min={10}
              max={32}
              value={appearance.fontSize}
              onChange={(e) => set({ fontSize: clamp(+e.target.value, 10, 32) })}
              className={FIELD}
            />
          </label>
          <label>
            <span className={LABEL}>Line height</span>
            <input
              type="number"
              min={1}
              max={2.5}
              step={0.1}
              value={appearance.lineHeight}
              onChange={(e) => set({ lineHeight: clamp(+e.target.value, 1, 2.5) })}
              className={FIELD}
            />
          </label>
        </div>

        <div className={`rounded-lg border border-line p-3 ${isCustom ? '' : 'opacity-50'}`}>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Custom colors</span>
            {!isCustom && (
              <button
                onClick={() => set({ themeId: 'custom' })}
                className="text-xs font-medium text-accent hover:underline"
              >
                Use custom theme
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {COLOR_FIELDS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={!isCustom}
                  value={appearance.custom[key] as string}
                  onChange={(e) =>
                    set({ themeId: 'custom', custom: { ...appearance.custom, [key]: e.target.value } })
                  }
                  className="h-7 w-9 shrink-0 cursor-pointer rounded border border-line bg-transparent"
                />
                <span className="text-[13px]">{label}</span>
              </label>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              disabled={!isCustom}
              checked={appearance.custom.dark}
              onChange={(e) => set({ custom: { ...appearance.custom, dark: e.target.checked } })}
              className="accent-[var(--accent)]"
            />
            <span>Dark UI chrome for this theme</span>
          </label>
        </div>
      </div>
    </div>
  )
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}
