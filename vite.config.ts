import { defineConfig } from 'vite-plus'

/**
 * Root Vite+ config. `vp lint`, `vp fmt` and `vp check` run from the workspace
 * root and use these shared blocks; per-package differences live in the
 * `overrides` lists below (Vite+ does not apply nested package lint/fmt
 * configs).
 */
const ignorePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  'apps/app/.wrangler/**',
  '.agents/skills/**',
  '.claude/skills/**',
  'packages/db/migrations/**',
  // OpenCode harness config, managed by the editor; `.opencode/` is
  // machine-local agent config (see AGENTS.md).
  'opencode.json',
  '.opencode/**',
  // Tauri shell: Rust sources and the checked-in tauri.conf.json are not
  // managed by the JS toolchain.
  'apps/app/src-tauri/**',
]

export default defineConfig({
  lint: {
    ignorePatterns,
    plugins: ['typescript'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ['apps/app/**'],
        // List `typescript` explicitly: an override's `plugins` controls the
        // matched files' plugin set and must not rely on base-list merging.
        plugins: ['typescript', 'react'],
        env: { browser: true },
      },
      {
        files: ['packages/db/**'],
        env: { node: true },
      },
    ],
  },
  fmt: {
    ignorePatterns,
    // Existing first-party style: no semicolons, single quotes.
    semi: false,
    singleQuote: true,
    // Keep manifest key order stable; dependency ordering is reviewed by hand.
    sortPackageJson: false,
  },
})
