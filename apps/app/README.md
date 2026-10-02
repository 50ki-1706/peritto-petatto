# app

Tauri desktop shell plus a Cloudflare Workers (Hono) server and a React client, in one Vite project.

## Structure

- `src/client/` – React client, mounts into `<div id="root">`
- `src/server/` – Hono app served by Cloudflare Workers (`wrangler.jsonc` main entry)
- `src-tauri/` – Tauri desktop shell
- `vite.config.ts` – Cloudflare Vite plugin + `vite-ssr-components` + React plugin
- `wrangler.jsonc` – Worker config (D1 binding `peritto_petatto`)

The server renders the HTML shell (including the client `<Script>`); React is mounted client-side.

## Authentication

The Hono server exposes Better Auth under `/api/auth/*`. Google OAuth accounts,
sessions and application data are stored in D1 through Drizzle ORM.

For local development, copy `.dev.vars.example` to the ignored `.dev.vars` file
and replace all placeholders. `BETTER_AUTH_URL` must be
`http://localhost:5173`; the matching Google OAuth redirect URI is
`http://localhost:5173/api/auth/callback/google`.

The real `.dev.vars` file and production secrets must never be committed.

Google sign-in initiation is limited through the `AUTH_RATE_LIMITER` Workers
binding. Each connecting IP can start up to 20 sign-ins per minute. Session
checks and OAuth callbacks are not counted, so completing a normal login flow
does not consume additional attempts.

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
vp run --filter db db:migrate:local   # wrangler d1 migrations apply (--local)
vp run --filter db db:migrate:remote  # wrangler d1 migrations apply (--remote)
```

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

Local development (`vp dev`) uses a local D1 database automatically; local state
lives in `apps/app/.wrangler/state` (relative to the repo root). The local
database is isolated local data, not a copy of production — delete that state
directory to reset it.

To change the schema, edit `packages/db/src/schema.ts`, then run
`vp run --filter db db:generate` to create the migration in
`packages/db/migrations/`, followed by `vp run --filter db db:migrate:local`.
Before deploying, apply it to the shared remote database with
`vp run --filter db db:migrate:remote`; this affects the production D1 database
`peritto-petatto`.
