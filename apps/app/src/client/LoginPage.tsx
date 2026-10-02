/** @jsxImportSource react */
import * as stylex from '@stylexjs/stylex'
import { loginStyles } from './login.styles'

function GoogleMark() {
  return (
    <svg aria-hidden="true" {...stylex.props(loginStyles.googleMark)} viewBox="0 0 24 24">
      <path
        fill="#4285f4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.53a6.03 6.03 0 0 1-8.98-3.17H3.07v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#fbbc05"
        d="M6.41 13.87A6.02 6.02 0 0 1 6.1 12c0-.65.11-1.28.31-1.87V7.51H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.49l3.34-2.62Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.93 5.51l3.34 2.62A5.96 5.96 0 0 1 12 5.98Z"
      />
    </svg>
  )
}

export function LoginPage() {
  return (
    <main {...stylex.props(loginStyles.page)}>
      <div {...stylex.props(loginStyles.ambientLight)} aria-hidden="true" />
      <section {...stylex.props(loginStyles.card)} aria-labelledby="login-title">
        <div {...stylex.props(loginStyles.wordmark)} aria-label="Petatto">
          Petatto
        </div>

        <div {...stylex.props(loginStyles.copy)}>
          <p {...stylex.props(loginStyles.eyebrow)}>WELCOME</p>
          <h1 id="login-title" {...stylex.props(loginStyles.heading)}>
            思いつきを、
            <br />
            ぺたっと残そう。
          </h1>
          <p {...stylex.props(loginStyles.description)}>
            やることも、ひらめきも。
            <br />
            気軽に貼って、すっきり整理できます。
          </p>
        </div>

        <div {...stylex.props(loginStyles.actions)}>
          <button type="button" {...stylex.props(loginStyles.googleButton)}>
            <GoogleMark />
            <span>Google でログイン</span>
          </button>
          <p {...stylex.props(loginStyles.note)}>Google アカウントでかんたんに始められます。</p>
        </div>
      </section>
    </main>
  )
}
