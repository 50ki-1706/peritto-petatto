# Project Agent Notes

## Cloudflare MCP servers
| Server | Use for | Auth |
| --- | --- | --- |
| cloudflare | General Cloudflare API access via its Code Mode tools (docs / search / execute) | OAuth |
| cloudflare-docs | Searching Cloudflare documentation | none (public) |
| cloudflare-bindings | Managing KV / R2 / D1 / Hyperdrive bindings; reading deployed worker code | OAuth |
| cloudflare-builds | Worker Builds status and build logs | OAuth |
| cloudflare-observability | Querying worker logs and metrics | OAuth |

- One-time setup: run `opencode mcp auth <server>` for the four OAuth servers.
- For the `general` agent, mutation-capable tools (`cloudflare_execute`, bindings create/delete/update/edit, D1 query) require approval (`ask`); choose "Allow once" to approve each mutation individually.
- Deploys use the wrangler CLI (see .agents/skills/wrangler); the MCP servers are for lookup, binding management, builds and observability.
