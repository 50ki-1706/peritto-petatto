# app

Tauri desktop shell plus a Cloudflare Workers (Hono) server and a React client, in one Vite project.

## Structure

- `src/client/` – React client, mounts into `<div id="root">`
- `src/server/` – Hono app served by Cloudflare Workers (`cloudflare.config.ts` entrypoint)
- `src-tauri/` – Tauri desktop shell
- `vite.config.ts` – Cloudflare Vite plugin v2 beta + `vite-ssr-components` + React plugin; mirrors the client build to `dist/client` for Tauri
- `cloudflare.config.ts` – single Cloudflare configuration (worker name, D1 binding, rate limit, required secrets), read by both the cf CLI and the Vite plugin

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
vp -C apps/app dev            # Vite dev server on http://localhost:5173 (same pipeline as `cf dev`)
vp -C apps/app build          # production build; also mirrors the client build to apps/app/dist/client for Tauri
vp run --filter app preview   # build, then serve the production output
vp run -r typecheck           # cf workers types + tsc in app, tsc in db
vp check                      # format + lint + type-check the workspace
```

Or from this directory:

```txt
vp dev            # app dev server (built-in command)
vp run dev        # cf dev (same pipeline, through the package script)
vp build          # app production build (built-in command)
vp run build      # same, through the package script
vp preview        # serve the existing production build (does not rebuild)
vp run preview    # build first, then serve (`vp run build && vp preview`)
vp run deploy     # cf deploy (builds Build Output and uploads the Worker)
vp run cf-typegen # generate Env types (cf workers types) to .cloudflare/types
vp run typecheck  # cf workers types && tsc --noEmit for this package
```

`vp preview` is the built-in preview command and only serves an existing build;
the `preview` script (`vp run preview`) rebuilds first and then calls it. The
same split applies to the root script `vp run --filter app preview`.

Database tasks live in [`packages/db`](../../packages/db):

```txt
vp run --filter db db:generate        # drizzle-kit generate
vp run --filter db db:migrate:local   # cf d1 migrations apply <id> --local
vp run --filter db db:migrate:remote  # cf d1 migrations apply <id> (remote)
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

Local development (`cf dev`, or `vp dev` which starts Vite directly) uses a
local D1 database automatically; local state lives in
`apps/app/.cloudflare/state/v3` (relative to the repo root), and
`db:migrate:local` writes the same state through
`--persist-to ../../apps/app/.cloudflare/state`. The local database is
isolated local data, not a copy of production — delete that state directory to
reset it. (The old `.wrangler/state` directory from Vite plugin 1.x is no
longer read.)

To change the schema, edit `packages/db/src/schema.ts`, then run
`vp run --filter db db:generate` to create the migration in
`packages/db/migrations/`, followed by `vp run --filter db db:migrate:local`
(cf d1 migrations apply with the database ID from `cloudflare.config.ts`).

Applying `vp run --filter db db:migrate:remote` writes the production D1
database `peritto-petatto` and requires explicit approval naming that database;
code/deploy approval is not enough. It needs Cloudflare credentials and an
account selection (`CLOUDFLARE_ACCOUNT_ID` or the interactive prompt) because
`packages/db` is not under `apps/app/cloudflare.config.ts`.

## Cloudflare configuration

`cloudflare.config.ts` is the single source of truth: worker name, entrypoint,
compatibility date/flags, D1 binding, rate limit and required secrets. The
`@cloudflare/vite-plugin` v2 beta reads it directly in dev and build (there is
no `configPath` option and no `wrangler.jsonc`), the cf CLI reads it for
`cf dev`/`cf build`/`cf deploy`/`cf workers types`/`cf d1`, and deploys go
through `vp run deploy` (`cf deploy`).

`vp build` and `cf build` write the deployable Build Output to
`.cloudflare/output/v0/`; `vite.config.ts` additionally mirrors the client build
to `dist/client`, which is what Tauri's unchanged `frontendDist` points at.
Generate binding types with `vp run cf-typegen` (`cf workers types`); the
git-ignored output in `.cloudflare/types/` is picked up by `tsconfig.json`.
Wrangler is only used for what cf does not support yet — `wrangler secret
put <NAME> --name peritto-petatto` and `wrangler tail peritto-petatto` — and
runs without a config file.
