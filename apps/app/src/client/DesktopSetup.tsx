/** @jsxImportSource react */
import * as stylex from '@stylexjs/stylex'
import { authStyles } from './auth.styles'

export function DesktopSetup() {
  return (
    <main {...stylex.props(authStyles.page)}>
      <section {...stylex.props(authStyles.card)} aria-labelledby="desktop-setup-title">
        <p {...stylex.props(authStyles.eyebrow)}>peritto petatto</p>
        <h1 id="desktop-setup-title" {...stylex.props(authStyles.title)}>
          デスクトップ版の接続は準備中です
        </h1>
        <p {...stylex.props(authStyles.description)}>
          このビルドは、デスクトップアプリの起動と画面表示を確認するためのものです。
          ログインと付箋の保存・同期は、Web版との接続を実装してから利用できます。
        </p>
      </section>
    </main>
  )
}
