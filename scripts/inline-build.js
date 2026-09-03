import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import { buildSync } from 'esbuild'
import { rmdirSync } from 'fs'

const dist = resolve('dist')
const htmlPath = resolve(dist, 'index.html')

let html = readFileSync(htmlPath, 'utf8')

// Find the JS and CSS asset filenames from the HTML
const jsMatch = html.match(/src="\.\/assets\/([^"]+\.js)"/)
const cssMatch = html.match(/href="\.\/assets\/([^"]+\.css)"/)

if (!jsMatch || !cssMatch) {
  console.error('Could not find asset references in index.html')
  process.exit(1)
}

const jsFile = resolve(dist, 'assets', jsMatch[1])
const cssFile = resolve(dist, 'assets', cssMatch[1])

// Bundle the ESM JS into a single IIFE file via esbuild
const bundledJs = buildSync({
  entryPoints: [jsFile],
  bundle: true,
  format: 'iife',
  write: false,
  minify: true,
}).outputFiles[0].text

// Escape </script> inside JS so it doesn't close the HTML tag prematurely
const safeJs = bundledJs.replace(/<\/script/gi, '<\\/script')

const css = readFileSync(cssFile, 'utf8')

// Inline the assets while preserving all other head/body content (SEO tags, etc.).
const output = html
  .replace(/<script[^>]*\ssrc=["'][^"']+["'][^>]*><\/script>/gi, '')
  .replace(/<link[^>]*\srel=["']stylesheet["'][^>]*>/gi, '')
  .replace(/<\/head>/i, `    <style>${css}</style>\n  </head>`)
  .replace(/<\/body>/i, `    <script>${safeJs}</script>\n  </body>`)

writeFileSync(htmlPath, output)

// Clean up the assets folder
try {
  const assetsDir = resolve(dist, 'assets')
  for (const f of readdirSync(assetsDir)) {
    unlinkSync(resolve(assetsDir, f))
  }
  rmdirSync(assetsDir)
} catch (e) {}

console.log(`Inlined build: ${htmlPath} (${(output.length / 1024).toFixed(0)} KB)`)
