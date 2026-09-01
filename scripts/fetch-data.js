import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://raw.githubusercontent.com/chrifox/stolen-realm-gearlib/master/src/assets/data'
const OUT_DIR = path.resolve(__dirname, '../src/data')

const SOURCES = [
  { key: 'guids', name: 'GUIDs.csv' },
  { key: 'weapons', name: 'weapon.csv' },
  { key: 'amulets', name: 'amulet.csv' },
  { key: 'chestplates', name: 'chestplate.csv' },
  { key: 'heads', name: 'head.csv' },
  { key: 'rings', name: 'ring.csv' },
  { key: 'shields', name: 'shield.csv' },
  { key: 'fortunes', name: 'fortune.csv' },
]

function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',' || char === '\n') {
        row.push(field)
        field = ''
        if (char === '\n') {
          rows.push(row)
          row = []
        }
      } else if (char === '\r') {
        // ignore carriage returns
      } else {
        field += char
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function rowsToObjects(rows) {
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const obj = {}
    header.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx].trim() : ''
    })
    return obj
  })
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return res.text()
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  // Fetch all CSVs in parallel (single batch), then write one combined file.
  const results = await Promise.all(
    SOURCES.map(async ({ key, name }) => {
      const url = `${BASE_URL}/${name}`
      const text = await fetchText(url)
      const objs = rowsToObjects(parseCSV(text))
      console.log(`Fetched ${name} -> ${objs.length} rows`)
      return { key, objs }
    })
  )

  const combined = {}
  for (const { key, objs } of results) {
    combined[key] = objs
  }

  // Merge local fortune supplement (entries missing from gearlib fortune.csv)
  const fortuneSuppPath = path.resolve(__dirname, 'guid-extract/fortune_supplement.csv')
  try {
    const suppText = await fs.readFile(fortuneSuppPath, 'utf-8')
    const suppObjs = rowsToObjects(parseCSV(suppText))
    console.log(`Loaded fortune supplement -> ${suppObjs.length} rows`)
    combined.fortunes = [...combined.fortunes, ...suppObjs]
  } catch {
    console.log('No fortune supplement found')
  }

  // Merge locally-extracted GUID map (from scripts/guid-extract/guid_map_items.csv)
  // This extends/overrides the gearlib GUIDs.csv with 905 items extracted from the game binary.
  const localGuidPath = path.resolve(__dirname, 'guid-extract/guid_map_items.csv')
  try {
    const localText = await fs.readFile(localGuidPath, 'utf-8')
    const localObjs = rowsToObjects(parseCSV(localText))
    console.log(`Loaded local GUID map -> ${localObjs.length} rows`)
    const merged = new Map()
    for (const g of combined.guids) merged.set(g.GUID, g)
    for (const g of localObjs) merged.set(g.GUID, { Name: g.Name, GUID: g.GUID })
    combined.guids = Array.from(merged.values())
    console.log(`Merged GUIDs: ${combined.guids.length} total`)
  } catch {
    console.log('No local GUID map found; using gearlib GUIDs only')
  }

  // Merge ItemMod GUID map
  const modPath = path.resolve(__dirname, 'guid-extract/guid_map_mods.csv')
  try {
    const modText = await fs.readFile(modPath, 'utf-8')
    const modObjs = rowsToObjects(parseCSV(modText))
    console.log(`Loaded ItemMod GUID map -> ${modObjs.length} rows`)
    combined.itemMods = modObjs
  } catch {
    console.log('No ItemMod map found')
  }

  // Merge locally-extracted skill/attribute GUID map
  const localSkillsPath = path.resolve(__dirname, 'guid-extract/guid_map_skills.csv')
  try {
    const skillsText = await fs.readFile(localSkillsPath, 'utf-8')
    const skillsObjs = rowsToObjects(parseCSV(skillsText))
    console.log(`Loaded local skill GUID map -> ${skillsObjs.length} rows`)
    combined.skillGuids = skillsObjs
  } catch {
    console.log('No local skill GUID map found')
  }

  // Merge skill descriptions from full extraction
  const skillDescPath = path.resolve(__dirname, 'guid-extract/guid_map_skills_full.csv')
  try {
    const descText = await fs.readFile(skillDescPath, 'utf-8')
    const descObjs = rowsToObjects(parseCSV(descText))
    console.log(`Loaded skill descriptions -> ${descObjs.length} rows`)
    const descMap = new Map(descObjs.map((s) => [s.GUID, s.Description || '']))
    for (const sg of combined.skillGuids) {
      if (descMap.has(sg.GUID)) sg.Description = descMap.get(sg.GUID)
    }
  } catch {
    console.log('No skill descriptions found')
  }

  // Merge rich skill data from reference site (stolenrealm.ianlamb.com)
  const skillDataPath = path.resolve(__dirname, 'guid-extract/skillData.json')
  try {
    let skillDataText = await fs.readFile(skillDataPath, 'utf-8')
    if (skillDataText.charCodeAt(0) === 0xFEFF) skillDataText = skillDataText.slice(1)
    const skillData = JSON.parse(skillDataText)
    console.log(`Loaded reference skill data -> ${skillData.length} skills`)
    const refByTitle = new Map(skillData.map((s) => [s.title.toLowerCase(), s]))
    for (const sg of combined.skillGuids) {
      const m = sg.Name?.match(/^[A-Z]+_\d+_[AP]\d+_(.+)$/)
      if (m) {
        const ref = refByTitle.get(m[1].toLowerCase())
        if (ref) {
          sg.refData = ref
        }
      }
    }
  } catch {
    console.log('No reference skill data found')
  }

  const outPath = path.join(OUT_DIR, 'all.json')
  await fs.writeFile(outPath, JSON.stringify(combined))
  console.log(`Wrote ${outPath} (combined ${Object.keys(combined).length} datasets)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
