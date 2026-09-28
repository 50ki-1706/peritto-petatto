/**
 * Extension point for brand or manual themes.
 *
 * Tokens are plain CSS custom properties declared by
 * `tokens.stylex.ts` (`colors`, `spacing`, `radius`, `typography`). Components
 * consume those vars, never literal theme values, so a theme only has to
 * override the vars in a scope where it applies.
 *
 * Later themes are added here with `stylex.createTheme` (current API, not
 * deprecated). For example, a brand theme would be:
 *
 * ```ts
 * import * as stylex from '@stylexjs/stylex'
 * import { colors } from './tokens.stylex'
 *
 * export const brand = stylex.createTheme(colors, {
 *   bg: '#0b1020',
 *   fg: '#eef2ff',
 *   accent: '#7c8cff',
 * })
 * ```
 *
 * Apply it with `stylex.props(brand)` on the subtree root; the overrides then
 * cascade to every component below. Manual (user-selected) themes would use
 * the same mechanism plus a class or data attribute instead of
 * `prefers-color-scheme`.
 *
 * The textual dark mode currently lives only in `tokens.stylex.ts` as media
 * overrides on `colors`, so no theme object exists yet.
 */
