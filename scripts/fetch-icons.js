import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '../public/images')

const GEARLIB = 'https://raw.githubusercontent.com/chrifox/stolen-realm-gearlib/master'
const PLANNER = 'https://raw.githubusercontent.com/ianlamb/stolen-realm-planner/main'

async function getTree(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/${repo.includes('gearlib') ? 'master' : 'main'}?recursive=1`)
  if (!res.ok) throw new Error(`Failed to get tree for ${repo}: ${res.status}`)
  const data = await res.json()
  return (data.tree || []).map((t) => t.path)
}

async function downloadBatch(baseUrl, paths, outDir) {
  await fs.mkdir(outDir, { recursive: true })
  let ok = 0
  let fail = 0
  for (const p of paths) {
    const name = path.basename(p)
    const out = path.join(outDir, name)
    try {
      const res = await fetch(`${baseUrl}/${p}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(out, buf)
      ok++
    } catch (e) {
      fail++
      console.warn(`  skipped ${name}: ${e.message}`)
    }
  }
  return { ok, fail }
}

async function main() {
  // Fortune icons from gearlib public/images/fortunes
  const gearlibPaths = (await getTree('chrifox/stolen-realm-gearlib')).filter(
    (p) => p.startsWith('public/images/fortunes/') && p.endsWith('.webp')
  )
  console.log(`Fortune icons to fetch: ${gearlibPaths.length}`)
  const fortuneRes = await downloadBatch(GEARLIB, gearlibPaths, path.join(PUBLIC_DIR, 'fortunes'))
  console.log(`  fortunes: ${fortuneRes.ok} ok, ${fortuneRes.fail} failed`)

  // Skill icons from planner public/skill-icons
  const plannerPaths = (await getTree('ianlamb/stolen-realm-planner')).filter(
    (p) => p.startsWith('public/skill-icons/') && p.endsWith('.png')
  )
  console.log(`Skill icons to fetch: ${plannerPaths.length}`)
  const skillRes = await downloadBatch(PLANNER, plannerPaths, path.join(PUBLIC_DIR, 'skills'))
  console.log(`  skills: ${skillRes.ok} ok, ${skillRes.fail} failed`)

  // Write a manifest of skill icon filenames + parsed skill names + tree.
  const skillManifest = plannerPaths.map((p) => {
    const file = path.basename(p)
    const tree = p.split('/')[2]
    const name = file.replace(/^.*? -\s*/, '').replace(/\s*Icon-min\.png$/, '').trim()
    return { file, name, tree }
  })
  const manifestPath = path.resolve(__dirname, '../src/data/skillsIcons.json')
  await fs.writeFile(manifestPath, JSON.stringify(skillManifest))
  console.log(`Wrote ${manifestPath} (${skillManifest.length} icons)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
