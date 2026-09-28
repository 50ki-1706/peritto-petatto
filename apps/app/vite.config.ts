import { cloudflare } from '@cloudflare/vite-plugin'
import stylex from '@stylexjs/unplugin'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

/**
 * Tauri's `frontendDist` (`../dist/client`) needs a static `index.html`, but
 * this is an SSR app: the Worker renders the HTML shell at runtime. Emit a
 * static entry for `tauri build` from the built client chunks.
 */
function tauriIndexHtml(): Plugin {
  return {
    name: 'tauri-index-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      if (this.environment?.name !== 'client') return

      const outputs = Object.values(bundle)
      const entry = outputs.find((output) => output.type === 'chunk' && output.isEntry)
      if (!entry) return
      const css = outputs
        .filter((output) => output.type === 'asset' && output.fileName.endsWith('.css'))
        .map((output) => output.fileName)

      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>peritto-petatto</title>
    ${css.map((file) => `<link rel="stylesheet" href="/${file}" />`).join('\n    ')}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entry.fileName}"></script>
  </body>
</html>
`,
      })
    },
  }
}

export default defineConfig({
  plugins: [
    cloudflare(),
    ssrPlugin({
      hotReload: {
        ignore: ['./src/client/**/*'],
      },
    }),
    stylex.vite({
      useCSSLayers: true,
      // Keep StyleX output in the client carrier (`client.css`, emitted as the
      // `main-<hash>.css` entry asset), never the separate server `style.css`
      // rollup-input entry asset: replacing that entry breaks vite:css-post's
      // reference bookkeeping (cssEntriesMap) with a TypeError.
      cssInjectionTarget: (fileName) => /(^|\/)main(-[\w-]{8,})?\.css$/i.test(fileName),
    }),
    react({
      include: [/\/src\/client\/.*\.[tj]sx?$/],
      jsxImportSource: 'react',
    }),
    tauriIndexHtml(),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
})
