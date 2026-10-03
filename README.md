# peritto-petatto

アナログの付箋の良さとデジタルを融合したタスク管理アプリ

## 使用技術

- React 19 / TypeScript / StyleX（スタイリング。Tailwind は不使用）
- Hono 4 on Cloudflare Workers（SSR + API 基盤）
- Cloudflare D1 / Drizzle ORM・drizzle-kit（認証・付箋スキーマとマイグレーション管理）
- Better Auth（Googleログインとセッション管理）
- Tauri v2（Rust デスクトップシェル）
- Vite+（vp）= ビルドツール兼タスクランナー、pnpm ワークスペース
- 開発ツール: Oxlint（vp check に統合）、lefthook + commitlint、GitHub Actions、Renovate

## 初回セットアップ

以下はローカル開発向けの手順。

1. 前提: Node.js 26（`.node-version` に `26.10.0`、version manager で読み込み）、pnpm 12.6.0（`packageManager` に指定）。Tauri のデスクトップ開発を行う場合のみ Rust ツールチェーン。
2. 依存をインストール: `pnpm install`（依存インストールは pnpm のみ）。
3. Vite+ をグローバル導入: `curl -fsSL https://vite.plus | bash`。グローバル未導入の場合は以降の `vp ...` を `pnpm exec vp ...` に置き換えて実行する。
4. `apps/app/.dev.vars.example`を`apps/app/.dev.vars`へコピーし、認証用の値を設定する。
5. 開発サーバーを起動: `vp -C apps/app dev`（http://localhost:5173）。
6. チェック: `vp check`（format + lint + type-check）、`vp run -r typecheck`。
7. DB にテーブルを追加した場合のみ: `packages/db/src/schema.ts` を編集 → `vp run --filter db db:generate` → `vp run --filter db db:migrate:local`（ローカル D1 に適用。`drizzle-kit push` は使わない）。

詳細（デプロイ・マイグレーション remote 適用・Tauri ビルドなど）は [apps/app/README.md](apps/app/README.md) を参照。
