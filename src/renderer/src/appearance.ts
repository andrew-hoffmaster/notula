/**
 * Editor appearance model: preset themes, custom colors, and fonts.
 *
 * A theme is just a named set of colors. Presets and the user's custom theme
 * share the exact same shape, so one renderer (see editorTheme.ts) draws both.
 * Pure data + selectors here; nothing imports CodeMirror so this stays cheap
 * to unit test.
 */

/** A minimal color palette. Derived colors (caret, selection, muted) are
 * computed at render time, so a theme only needs these five values. */
export interface ColorSet {
  /** Whether the app chrome should switch to dark mode for this theme. */
  dark: boolean
  /** Editor background. */
  bg: string
  /** Default text. */
  fg: string
  /** Links, cursor, list markers. */
  accent: string
  /** Markdown headings and bold. */
  heading: string
}

/** Font family choices, as CSS stacks (no bundled font files). */
export const FONT_STACKS: Record<string, string> = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
}

/** Built-in editor themes, keyed by id. */
export const PRESETS: Record<string, ColorSet> = {
  light: { dark: false, bg: '#ffffff', fg: '#1f2328', accent: '#0969da', heading: '#1f2328' },
  // Dark backgrounds kept deep/near-black (hue preserved) so the writing
  // surface reads rich rather than washed-gray.
  notula: { dark: true, bg: '#0e0f1a', fg: '#e9e9ef', accent: '#9184d9', heading: '#a99ff0' },
  'one-dark': { dark: true, bg: '#1a1d23', fg: '#abb2bf', accent: '#61afef', heading: '#e5c07b' },
  'solarized-dark': {
    dark: true,
    bg: '#00212b',
    fg: '#93a1a1',
    accent: '#268bd2',
    heading: '#b58900'
  },
  dracula: { dark: true, bg: '#1b1c25', fg: '#f8f8f2', accent: '#bd93f9', heading: '#ff79c6' },
  'github-light': {
    dark: false,
    bg: '#ffffff',
    fg: '#24292f',
    accent: '#0969da',
    heading: '#0550ae'
  }
}

/** Human labels for the theme dropdown (order preserved). */
export const THEME_LABELS: Array<[string, string]> = [
  ['light', 'Light'],
  ['notula', 'Notula Dark'],
  ['one-dark', 'One Dark'],
  ['solarized-dark', 'Solarized Dark'],
  ['dracula', 'Dracula'],
  ['github-light', 'GitHub Light'],
  ['custom', 'Custom…']
]

/** The full, persisted appearance configuration. */
export interface Appearance {
  /** Preset id, or `'custom'` to use `custom`. */
  themeId: string
  /** Key into {@link FONT_STACKS}. */
  fontFamily: keyof typeof FONT_STACKS | string
  /** Editor font size in px. */
  fontSize: number
  /** Editor line height (unitless). */
  lineHeight: number
  /** Colors used when `themeId === 'custom'`. */
  custom: ColorSet
}

/** Defaults applied on first run and to fill any missing persisted fields. */
export const DEFAULT_APPEARANCE: Appearance = {
  themeId: 'light',
  fontFamily: 'sans',
  fontSize: 15,
  lineHeight: 1.7,
  custom: { dark: true, bg: '#0e0f1a', fg: '#e9e9ef', accent: '#9184d9', heading: '#a99ff0' }
}

/** The color set currently in effect (a preset, or the custom palette). */
export function activeColors(a: Appearance): ColorSet {
  if (a.themeId === 'custom') return a.custom
  return PRESETS[a.themeId] ?? PRESETS.light
}

/** Fill any missing/invalid fields of a partial appearance with defaults. */
export function normalizeAppearance(partial: unknown): Appearance {
  const p = (partial ?? {}) as Partial<Appearance>
  const d = DEFAULT_APPEARANCE
  return {
    themeId: typeof p.themeId === 'string' ? p.themeId : d.themeId,
    fontFamily: typeof p.fontFamily === 'string' ? p.fontFamily : d.fontFamily,
    fontSize: typeof p.fontSize === 'number' ? p.fontSize : d.fontSize,
    lineHeight: typeof p.lineHeight === 'number' ? p.lineHeight : d.lineHeight,
    custom: { ...d.custom, ...(p.custom ?? {}) }
  }
}

const STORAGE_KEY = 'notula:appearance'

/** Load and normalize the persisted appearance. */
export function loadAppearance(): Appearance {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return normalizeAppearance(raw ? JSON.parse(raw) : {})
  } catch {
    return DEFAULT_APPEARANCE
  }
}

/** Persist the appearance. */
export function saveAppearance(a: Appearance): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
}

/** Toggle the app-chrome dark class to match the active theme. */
export function applyChrome(a: Appearance): void {
  document.documentElement.classList.toggle('dark', activeColors(a).dark)
}

/** The resolved CSS font stack for the current appearance. */
export function fontStack(a: Appearance): string {
  return FONT_STACKS[a.fontFamily] ?? FONT_STACKS.sans
}
