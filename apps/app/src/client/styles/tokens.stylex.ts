import * as stylex from '@stylexjs/stylex'

/**
 * Design tokens for the client. StyleX requires this file to contain only
 * `defineVars` results, one var group per named export; see `themes.ts` for
 * how future brand or manual themes override them.
 *
 * Dark mode lives here as per-key media overrides, so `colors` stays a single
 * var group and components never branch on the color scheme.
 */
export const colors = stylex.defineVars({
  bg: { default: '#ffffff', '@media (prefers-color-scheme: dark)': '#111111' },
  fg: {
    default: '#1f2328',
    '@media (prefers-color-scheme: dark)': '#e6edf3',
  },
  surface: {
    default: '#f6f8fa',
    '@media (prefers-color-scheme: dark)': '#161b22',
  },
  accent: {
    default: '#0969da',
    '@media (prefers-color-scheme: dark)': '#4493f8',
  },
  focus: {
    default: '#0969da',
    '@media (prefers-color-scheme: dark)': '#4493f8',
  },
})

export const spacing = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
})

export const radius = stylex.defineVars({
  sm: '4px',
  md: '8px',
  full: '9999px',
})

/**
 * `fontFamily` intentionally duplicates the unlayered `h1` rule in
 * `src/server/style.css`: unlayered declarations beat StyleX's layered output
 * (`@layer priority1`/`priority2`/`priority3`) at equal specificity, so the
 * server rule wins for `h1` today. Changing either font stack requires
 * reviewing the other.
 */
export const typography = stylex.defineVars({
  fontFamily: "'Arial', Helvetica, sans-serif",
  fontSizeBase: '16px',
})
