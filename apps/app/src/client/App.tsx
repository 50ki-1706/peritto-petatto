/** @jsxImportSource react */
import * as stylex from '@stylexjs/stylex'
import { colors, typography } from './styles/tokens.stylex'

const styles = stylex.create({
  root: {
    backgroundColor: colors.bg,
    color: colors.fg,
    minHeight: '100vh',
  },
  heading: {
    color: colors.accent,
    fontFamily: typography.fontFamily,
  },
})

export function App() {
  return (
    <div {...stylex.props(styles.root)}>
      <h1 {...stylex.props(styles.heading)}>petitto-petatto</h1>
    </div>
  )
}
