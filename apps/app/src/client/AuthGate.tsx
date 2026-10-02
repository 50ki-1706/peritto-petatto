/** @jsxImportSource react */
import * as stylex from '@stylexjs/stylex'
import { useState, type ReactNode } from 'react'
import { authStyles } from './auth.styles'
import { authClient } from './authClient'

type AuthGateProps = {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const { data: session, isPending, error } = authClient.useSession()
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function signIn() {
    setActionError('')
    setIsSubmitting(true)
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      })
      if (result.error) setActionError('Googleログインを開始できませんでした。')
    } catch {
      setActionError('通信に失敗しました。時間をおいてもう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function signOut() {
    setActionError('')
    setIsSubmitting(true)
    try {
      const result = await authClient.signOut()
      if (result.error) setActionError('ログアウトできませんでした。')
    } catch {
      setActionError('通信に失敗しました。時間をおいてもう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isPending) {
    return (
      <main {...stylex.props(authStyles.page)} aria-busy="true">
        <p {...stylex.props(authStyles.status)}>ログイン状態を確認しています…</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main {...stylex.props(authStyles.page)}>
        <section {...stylex.props(authStyles.card)} aria-labelledby="login-title">
          <p {...stylex.props(authStyles.eyebrow)}>peritto petatto</p>
          <h1 id="login-title" {...stylex.props(authStyles.title)}>
            付箋を、どこでも同じように。
          </h1>
          <p {...stylex.props(authStyles.description)}>
            Googleでログインすると、PCとスマートフォンから同じ付箋を使えます。
          </p>
          <button
            type="button"
            {...stylex.props(authStyles.googleButton)}
            onClick={signIn}
            disabled={isSubmitting}
          >
            <span {...stylex.props(authStyles.googleMark)} aria-hidden="true">
              G
            </span>
            {isSubmitting ? 'Googleへ移動しています…' : 'Googleでログイン'}
          </button>
          {(error || actionError) && (
            <p role="alert" {...stylex.props(authStyles.error)}>
              {actionError || 'ログイン状態を確認できませんでした。再読み込みしてください。'}
            </p>
          )}
        </section>
      </main>
    )
  }

  return (
    <>
      {children}
      <aside {...stylex.props(authStyles.account)} aria-label="アカウント">
        <span {...stylex.props(authStyles.userName)} title={session.user.email}>
          {session.user.name || session.user.email}
        </span>
        <button
          type="button"
          {...stylex.props(authStyles.signOutButton)}
          onClick={signOut}
          disabled={isSubmitting}
        >
          {isSubmitting ? '処理中…' : 'ログアウト'}
        </button>
        {actionError && (
          <span role="alert" {...stylex.props(authStyles.accountError)}>
            {actionError}
          </span>
        )}
      </aside>
    </>
  )
}
