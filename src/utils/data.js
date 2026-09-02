import all from '../data/all.json'
import skillIcons from '../data/skillsIcons.json'

const guids = all.guids
const fortunes = all.fortunes
const skillGuids = all.skillGuids || []
const itemMods = all.itemMods || []

export const gearCategories = [
  { key: 'weapon', label: 'Weapon', items: all.weapons },
  { key: 'amulet', label: 'Amulet', items: all.amulets },
  { key: 'chestplate', label: 'Chestplate', items: all.chestplates },
  { key: 'head', label: 'Head', items: all.heads },
  { key: 'ring', label: 'Ring', items: all.rings },
  { key: 'shield', label: 'Shield', items: all.shields },
]

// Lookup name for a gear item GUID (from GUIDs.csv).
const guidToName = new Map(guids.map((g) => [g.GUID, g.Name]))
// Reverse lookup: gear item name -> GUID.
const nameToGuid = new Map(guids.map((g) => [g.Name, g.GUID]))

// Lookup name for a skill/attribute GUID
const skillGuidToName = new Map(skillGuids.map((s) => [s.GUID, s.Name]))
const skillGuidToDesc = new Map(skillGuids.map((s) => [s.GUID, s.Description || '']))
const skillGuidToRef = new Map(skillGuids.map((s) => [s.GUID, s.refData || null]))
// Current in-game display name (from localization; differs for renamed skills)
const skillGuidToDisplayName = new Map(skillGuids.filter((s) => s.DisplayName).map((s) => [s.GUID, s.DisplayName]))

// name -> first matching gear row (so we can show category/rarity on grids)
const nameToGear = new Map()
for (const cat of gearCategories) {
  for (const item of cat.items) {
    if (!nameToGear.has(item.Name)) {
      nameToGear.set(item.Name, { ...item, _category: cat.label })
    }
  }
}

export function getNameByGuid(guid) {
  if (!guid) return ''
  return guidToName.get(guid) || ''
}

export function getGuidByName(name) {
  if (!name) return ''
  return nameToGuid.get(name) || ''
}

export function getSkillNameByGuid(guid) {
  if (!guid) return ''
  return skillGuidToName.get(guid) || ''
}

export function getSkillDescByGuid(guid) {
  if (!guid) return ''
  return skillGuidToDesc.get(guid) || ''
}

export function getSkillDisplayNameByGuid(guid) {
  if (!guid) return ''
  return skillGuidToDisplayName.get(guid) || ''
}

export function getSkillRefByGuid(guid) {
  if (!guid) return null
  return skillGuidToRef.get(guid) || null
}

export function computeDamageRange(refData, might, characterLevel) {
  if (!refData || !refData.damageMod) return null
  const bonuses = 0
  const spellPower = Math.ceil((9 + characterLevel * 4) * (0.9 + might / 100) * (bonuses + 1))
  const attackPower = 0 // can't compute without weapon
  const mod = Number(refData.damageMod)
  if (!mod) return null

  const desc = refData.description || ''
  const isSpell = desc.includes('Spell Power')
  const isAttack = desc.includes('Attack Power')
  if (!isSpell && !isAttack) return null

  const base = isSpell ? spellPower : attackPower
  if (base === 0) return { min: 0, max: 0, type: refData.damageType, powerType: isSpell ? 'Spell' : 'Attack' }

  const hasTilde = desc.includes('[~')
  if (hasTilde) {
    return {
      min: Math.ceil(mod * base * 0.85),
      max: Math.ceil(mod * base * 1.15),
      type: refData.damageType,
      powerType: isSpell ? 'Spell' : 'Attack',
    }
  }
  const val = Math.ceil(mod * base)
  return { min: val, max: val, type: refData.damageType, powerType: isSpell ? 'Spell' : 'Attack' }
}

export function getItemTooltip(name) {
  const gear = nameToGear.get(name)
  if (!gear) return null
  const parts = []
  if (gear['Attack Power'] && gear['Attack Power'] !== '') parts.push(`AP: ${gear['Attack Power']}`)
  if (gear['Damage Type'] && gear['Damage Type'] !== '') parts.push(gear['Damage Type'])
  if (gear['Base Stats'] && gear['Base Stats'] !== '') parts.push(gear['Base Stats'].replace(/^\s*-\s*/gm, '').trim())
  if (gear['Attributes'] && gear['Attributes'] !== '') parts.push(gear['Attributes'].replace(/^\s*-\s*/gm, '').trim())
  return parts.length ? parts.join('\n') : null
}

export { skillGuids }

export function getCategoryByName(name) {
  return nameToGear.get(name)?._category || ''
}

export function getRarityByName(name) {
  const r = nameToGear.get(name)?.Rarity || ''
  return formatRarity(r)
}

export function formatRarity(r) {
  if (!r) return ''
  return r.includes(':') ? r.split(':')[1].trim() : r
}

const RARITY_COLORS = {
  mythic: '#d4a017',
  legendary: '#a335ee',
  rare: '#4a9eff',
  uncommon: '#4cdf5f',
  common: '#cccccc',
}

export function rarityColor(rarity) {
  const r = (rarity || '').toLowerCase()
  return RARITY_COLORS[r] || ''
}

const HC_COLORS = { 1: '#4cdf5f', 2: '#4a9eff', 3: '#e05d5d' }

export function hcColor(tier) {
  return HC_COLORS[tier] || ''
}

export function searchGear(query) {
  const q = query.toLowerCase()
  const results = []
  for (const cat of gearCategories) {
    for (const item of cat.items) {
      if (
        item.Name.toLowerCase().includes(q) ||
        (item['Base Stats'] || '').toLowerCase().includes(q) ||
        (item['Attributes'] || '').toLowerCase().includes(q)
      ) {
        results.push({ ...item, _category: cat.label })
      }
    }
  }
  return results
}

export function searchFortunes(query) {
  const q = query.toLowerCase()
  return fortunes.filter(
    (f) => f.Name.toLowerCase().includes(q) || (f.Description || '').toLowerCase().includes(q)
  )
}

const modGuidToName = new Map(itemMods.map((m) => [m.GUID, m.Name]))
const modGuidToDesc = new Map(itemMods.map((m) => [m.GUID, m.Description || '']))

export function getModNameByGuid(guid) {
  if (!guid) return ''
  return modGuidToName.get(guid) || ''
}

export function getModDescByGuid(guid) {
  if (!guid) return ''
  return modGuidToDesc.get(guid) || ''
}

const TIER_MOD_GUIDS = {
  'a50cd964-536e-4fab-ad51-e4fe47e0f94f': 1,
  '0ea9a23e-a6e2-4846-b2a5-3c95ee6832a8': 2,
  'd4054a7e-c0fc-423b-8a43-4945d93774b1': 3,
}

export function getTierFromModIds(modIds) {
  if (!modIds || !Array.isArray(modIds)) return 0
  let highest = 0
  for (const g of modIds) {
    if (TIER_MOD_GUIDS[g] && TIER_MOD_GUIDS[g] > highest) {
      highest = TIER_MOD_GUIDS[g]
    }
  }
  return highest
}

export function searchItemMods(query) {
  const q = query.toLowerCase()
  return itemMods.filter(
    (m) => m.Name.toLowerCase().includes(q) || (m.Description || '').toLowerCase().includes(q)
  )
}

const BASE = import.meta.env.BASE_URL || '/'

export function fortuneIconUrl(fortune) {
  const slug = (fortune.Name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${BASE}images/fortunes/${slug}_fortune.webp`
}

export function skillIconUrl(file) {
  return `${BASE}images/skills/${file}`
}

export const skillTrees = [...new Set(skillIcons.map((s) => s.tree))]

export function searchSkillIcons(query) {
  const q = query.toLowerCase()
  return skillIcons.filter((s) => !q || s.name.toLowerCase().includes(q) || s.tree.toLowerCase().includes(q))
}

const PREFIX_TO_TREE = {
  CHAOS: 'chaos', COLD: 'cold', FIRE: 'fire', LGT: 'light',
  LTN: 'lightning', MNK: 'monk', NAT: 'nature', RNG: 'ranger',
  SHD: 'shadow', THF: 'thief', WAR: 'warrior',
}

const iconByNameSuffix = new Map()
for (const icon of skillIcons) {
  const parts = icon.name.split(' ')
  const suffix = parts.slice(2).join(' ')
  if (suffix) iconByNameSuffix.set(suffix.toLowerCase(), icon)
}

export function getSkillIconForName(skillName) {
  if (!skillName) return null
  const m = skillName.match(/^([A-Z]+)_(\d+)_[AP](\d+)_(.+)$/)
  if (!m) return null
  const suffix = m[4]
  return iconByNameSuffix.get(suffix.toLowerCase()) || null
}

export function getSkillTree(skillName) {
  if (!skillName) return null
  const m = skillName.match(/^([A-Z]+)_/)
  if (!m) return null
  return PREFIX_TO_TREE[m[1]] || null
}

export function parseSkillName(skillName) {
  const m = skillName.match(/^([A-Z]+)_(\d+)_([AP])(\d+)_(.+)$/)
  if (!m) return { prefix: null, tier: null, type: null, num: null, skillName, cleanName: skillName }
  const prefix = m[1]
  return {
    prefix,
    tier: Number(m[2]),
    type: m[3] === 'A' ? 'Active' : 'Passive',
    num: Number(m[4]),
    skillName: m[5],
    cleanName: m[5],
    tree: PREFIX_TO_TREE[prefix] || null,
  }
}

export const STATS_KEYS = ['ReflexBase', 'MightBase', 'DexterityBase', 'VitalityBase', 'IntelligenceBase']
export const GOLD_XP_KEYS = ['Gold', 'OldExperience']

export const EQUIP_SLOTS = [
  { index: -1, label: 'Unequipped' },
  { index: 0, label: 'Main Hand' },
  { index: 1, label: 'Off Hand' },
  { index: 2, label: 'Chestplate' },
  { index: 3, label: 'Head' },
  { index: 4, label: 'Ring' },
  { index: 5, label: 'Amulet' },
]

export const FORTUNE_SLOTS = [
  { index: -1, label: 'Unequipped' },
  { index: 1, label: 'Slot 1' },
  { index: 2, label: 'Slot 2' },
  { index: 3, label: 'Slot 3' },
  { index: 4, label: 'Slot 4' },
]

export function getEquipSlotLabel(idx) {
  const s = EQUIP_SLOTS.find((s) => s.index === idx)
  return s ? s.label : `Slot ${idx}`
}

export function getFortuneSlotLabel(idx) {
  const s = FORTUNE_SLOTS.find((s) => s.index === idx)
  return s ? s.label : `Slot ${idx}`
}

export function getCategoryByGuid(guid) {
  const name = getNameByGuid(guid)
  return getCategoryByName(name)
}

const CATEGORY_ICONS = {
  'Weapon': 'hand1',
  'Amulet': 'amulet',
  'Chestplate': 'chestplate',
  'Head': 'head',
  'Ring': 'ring',
  'Shield': 'hand2',
}

export function categoryIconUrl(category) {
  const file = CATEGORY_ICONS[category]
  if (!file) return null
  return `${BASE}images/icon/${file}.png`
}

export { fortunes }
