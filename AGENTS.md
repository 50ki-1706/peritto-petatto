# Project Agent Notes

## Task runner: Vite+ (vp)

Vite+ (`vp`) is the single task runner for this monorepo: package scripts call
bare tool names (`vp`, `tsc`, `wrangler`, ...) and never a package manager.

### Bootstrap

1. Install dependencies once with `pnpm install` (pnpm stays the workspace
   package manager; `packageManager` is `pnpm@12.6.0`).
2. Run everything through Vite+:
   - Global CLI: install once with `curl -fsSL https://vite.plus | bash`, then run `vp ...`.
   - Project-local only: no global install needed, prefix commands with `pnpm exec`, e.g. `pnpm exec vp check`.

`vp` inside `package.json` scripts resolves from `node_modules/.bin` via PATH,
which the package manager provides, so scripts work with either setup.

### pnpm -> vp mapping

| pnpm                                  | Vite+                                                                |
| ------------------------------------- | -------------------------------------------------------------------- |
| `pnpm install`                        | `vp install`                                                         |
| `pnpm add --filter app <pkg>`         | `vp add --filter app <pkg>` (or `vp add <pkg>` from the package dir) |
| `pnpm --filter app dev` / `build`     | `vp -C apps/app dev` / `vp -C apps/app build`                        |
| `pnpm --filter app <task>`            | `vp run --filter app <task>`                                         |
| `pnpm -r <task>`                      | `vp run -r <task>`                                                   |
| `pnpm --filter app exec wrangler ...` | `vp -C apps/app exec wrangler ...`                                   |
| `pnpm check` / `pnpm test`            | `vp check` / `vp test`                                               |

`vp <command>` is the built-in command; `vp run <command>` runs the
`package.json` script with that name (for example `vp build` vs `vp run build`).

`wrangler` and `cf` are dependencies of `apps/app` and `packages/db`, not of the
workspace root, so their commands go through a package directory
(`vp -C apps/app exec cf ...`, `vp -C packages/db exec cf ...`).

### Rules

- No `pnpm`, `npm`, `npx` or `$npm_execpath` inside script bodies; bare tool
  names only.
- `vite-plus` is pinned exactly in the workspace catalog
  (`catalog.vite-plus` in `pnpm-workspace.yaml`, referenced as `catalog:` by the
  root and `apps/app`). RC software: upgrades are deliberate, via `vp upgrade`.
- A globally installed `vp` and the project-local `vite-plus` are versioned
  independently; project commands always use the workspace-pinned version.
- Tauri starts the dev server and build by invoking `vp dev` / `vp build`
  directly (`apps/app/src-tauri/tauri.conf.json`).

### Checks

- `vp check` runs format, lint (Oxlint, type-aware) and type-check for the
  workspace; shared config lives in the root `vite.config.ts`.
- `vp run -r typecheck` runs `tsc --noEmit` in every package that defines a
  `typecheck` script.

## Database (D1)

Schema lives in `packages/db/src/schema.ts`. Migrations are generated, never
pushed (`drizzle-kit generate` only, no `drizzle-kit push`): edit the schema,
run `vp run --filter db db:generate`, then `vp run --filter db db:migrate:local`.

The migration scripts use the cf CLI (`cf d1 migrations apply <DATABASE_ID>` with
`--dir ./migrations`):

- `db:migrate:local` applies to the local D1 state in
  `apps/app/.cloudflare/state/v3`, shared with the dev server (Vite plugin v2
  beta) through `--persist-to ../../apps/app/.cloudflare/state`.
- `db:migrate:remote` (no `--local`) writes the shared production D1 database
  `peritto-petatto` (`9a925e04-8b23-4012-bd99-c73190548545`). Never run it without
  explicit approval that names that production database: approval to change or
  deploy code does not imply approval to write the database. It needs credentials
  and an account (`CLOUDFLARE_ACCOUNT_ID=9135d42f432d487a4755560f331db1ae` or an
  interactive account choice), because `packages/db` is not under
  `apps/app/cloudflare.config.ts`.

Local development binds to the local D1 database (the D1 binding in
`apps/app/cloudflare.config.ts` is simulated locally); local state lives in
`apps/app/.cloudflare/state` and is isolated local data, not a copy of
production.

## Cloudflare MCP servers

| Server                   | Use for                                                                         | Auth          |
| ------------------------ | ------------------------------------------------------------------------------- | ------------- |
| cloudflare               | General Cloudflare API access via its Code Mode tools (docs / search / execute) | OAuth         |
| cloudflare-docs          | Searching Cloudflare documentation                                              | none (public) |
| cloudflare-bindings      | Managing KV / R2 / D1 / Hyperdrive bindings; reading deployed worker code       | OAuth         |
| cloudflare-builds        | Worker Builds status and build logs                                             | OAuth         |
| cloudflare-observability | Querying worker logs and metrics                                                | OAuth         |

- One-time setup: run `opencode mcp auth <server>` for the four OAuth servers.
- Mutation-capable tools (`cloudflare_execute`, bindings create/delete/update/edit, D1 query) should be approval-gated (`ask`) via personal agent config (see `.opencode/agents/`, machine-local git-ignored).
- Deploys run `vp run --filter app deploy` (`cf deploy`: builds with the
  `@cloudflare/vite-plugin` v2 beta from `cloudflare.config.ts`, then uploads).
  The project-local `cf` CLI owns the whole project lifecycle (`cf dev`,
  `cf build`, `cf deploy`, `cf workers types`, `cf d1`). Wrangler is retained
  only for commands `cf` does not support yet — single-secret management
  (`wrangler secret put <NAME> --name peritto-petatto`) and log tailing
  (`wrangler tail peritto-petatto`); both work config-less because the Worker
  name is passed explicitly (`wrangler.jsonc` was removed). The installed
  `wrangler` skill routes `cf`/`cloudflare.config.ts` projects to the cf docs
  (see the [cf agent guide](https://developers.cloudflare.com/cf/agents/)); the
  MCP servers are for lookup, binding management, builds and observability.

## Dependency updates

Renovate (hosted GitHub App) manages the pnpm workspace (including `catalog:`),
Cargo (requires the committed `apps/app/src-tauri/Cargo.lock`) and GitHub
Actions. The Vite+ RC toolchain is intentionally frozen: `vite-plus`,
`@voidzero-dev/*`, the `vite` alias and the `vitest` override upgrade only via
`vp upgrade`; `packageManager` stays manual (Renovate does not manage
`devEngines` yet).

OSV-Scanner runs in CI on PRs and weekly with `upload-sarif: false` (flip to
`true` once GitHub Code Scanning is available). Post-push: push the repo,
install github.com/apps/renovate for it, enable Dependency graph + Dependabot
alerts, then review the Renovate onboarding PR / Dependency Dashboard.
