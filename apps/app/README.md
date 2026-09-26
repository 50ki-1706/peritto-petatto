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

Bootstrap once with `pnpm install` (pnpm remains the workspace package manager).
Everything else runs through Vite+ (`vp`). Without the global CLI
(`curl -fsSL https://vite.plus | bash`) prefix commands with `pnpm exec`, for
example `pnpm exec vp check`.

Run from the repo root:

```txt
vp install                    # install all workspace dependencies
vp -C apps/app dev            # Vite+ dev server on http://localhost:5173
vp -C apps/app build          # production build: dist/client (+ generated index.html for Tauri) and dist/api
vp run --filter app preview   # build, then serve the production output
vp run -r typecheck           # tsc --noEmit in every package
vp check                      # format + lint + type-check the workspace
```

Or from this directory:

```txt
vp dev            # app dev server (built-in command)
vp run dev        # same, through the package script
vp build          # app production build (built-in command)
vp run build      # same, through the package script
vp preview        # serve the existing production build (does not rebuild)
vp run preview    # build first, then serve (`vp run build && vp preview`)
vp run deploy     # build + wrangler deploy
vp run cf-typegen # generate CloudflareBindings types from wrangler.jsonc
vp run typecheck  # tsc --noEmit for this package
```

`vp preview` is the built-in preview command and only serves an existing build;
the `preview` script (`vp run preview`) rebuilds first and then calls it. The
same split applies to the root script `vp run --filter app preview`.

Database tasks live in [`packages/db`](../../packages/db):

```txt
vp run --filter db db:generate        # drizzle-kit generate
vp run --filter db db:export          # drizzle-kit export > schema.sql
vp run --filter db db:migrate:local   # wrangler d1 migrations apply (--local)
vp run --filter db db:migrate:remote  # wrangler d1 migrations apply (--remote)
```

`db:export` overwrites `packages/db/schema.sql`: the shell redirect
(`> schema.sql`) truncates the file before `drizzle-kit` runs, and the currently
committed `schema.sql` is a hand-written placeholder note, so running the task
clobbers that note. TODO: generate `schema.sql` deliberately or gitignore it.

Tauri:

```txt
vp run tauri dev                  # from apps/app
vp run tauri build                # from apps/app
vp run --filter app tauri dev     # from the repo root
vp run --filter app tauri build   # from the repo root
```

`src-tauri/tauri.conf.json` starts the Vite server with `vp dev`
(`beforeDevCommand`, cwd `..`) and builds with `vp build` (`beforeBuildCommand`).

## Database

D1 schema and migration scripts live in [`packages/db`](../../packages/db).
