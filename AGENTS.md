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

`wrangler` is a dependency of `apps/app` and `packages/db`, not of the workspace
root, so wrangler commands go through a package directory
(`vp -C apps/app exec wrangler ...`).

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
- Deploys run `vp run --filter app deploy`, which internally uses the wrangler CLI (see .agents/skills/wrangler); the MCP servers are for lookup, binding management, builds and observability.
