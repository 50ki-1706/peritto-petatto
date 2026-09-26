import { defineConfig } from 'drizzle-kit';

// NOTE: `drizzle-kit push` against Cloudflare D1 requires dbCredentials with
// the d1-http driver and a Cloudflare API token. That is intentionally omitted:
// this is a generate-only setup (db:generate -> migrations/ -> wrangler apply).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './migrations',
});
