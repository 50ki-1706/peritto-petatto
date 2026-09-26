# app

Tauri desktop shell plus a Cloudflare Workers (Hono) server and a React client, in one Vite project.

## Structure

- `src/client/` – React client, mounts into `<div id="root">`
- `src/server/` – Hono app served by Cloudflare Workers (`wrangler.jsonc` main entry)
- `src-tauri/` – Tauri desktop shell
- `vite.config.ts` – Cloudflare Vite plugin + `vite-ssr-components` + React plugin
- `wrangler.jsonc` – Worker config (D1 binding `peritto_petatto`)

The server renders the HTML shell (including the client `<Script>`); React is mounted client-side.

## Commands

Run from the repo root (pnpm workspace):

```txt
pnpm install     # install all workspace dependencies
pnpm dev         # Vite+ dev server (vp dev) on http://localhost:5173
pnpm build       # Vite+ production build (vp build): dist/client (+ generated index.html for Tauri) and dist/api
pnpm typecheck   # tsc --noEmit for this package
```

Or from this directory:

```txt
pnpm dev
pnpm build
pnpm preview     # build + preview the production output
pnpm deploy      # build + wrangler deploy
pnpm cf-typegen  # generate CloudflareBindings types from wrangler.jsonc
```

Tauri:

```txt
pnpm tauri dev
pnpm tauri build
```

`src-tauri/tauri.conf.json` starts the Vite server with `vp dev` (`beforeDevCommand`, cwd `..`) and builds with `vp build` (`beforeBuildCommand`).

## Database

D1 schema and migration scripts live in [`packages/db`](../../packages/db).
