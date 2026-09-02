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

// Build the HTML from scratch instead of fragile regex replacements
const head = html.split('</head>')[0]
const faviconLines = head
  .split('\n')
  .filter(l => l.includes('rel="icon"') || l.includes('rel="apple-touch-icon"'))
  .join('\n')

const output = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${faviconLines}
    <title>Azeroth Savr - Stolen Realms Save Editor</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${safeJs}</script>
  </body>
</html>
`

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
