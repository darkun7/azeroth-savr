import { useMemo, useState } from 'react'
import {
  getSkillNameByGuid,
  getSkillDescByGuid,
  getSkillDisplayNameByGuid,
  getSkillRefByGuid,
  getSkillIconForName,
  parseSkillName,
  skillIconUrl,
  computeDamageRange,
} from '../utils/data.js'
import Tooltip from './Tooltip.jsx'

const TREE_LABELS = {
  chaos: 'Chaos', cold: 'Cold', fire: 'Fire', light: 'Light',
  lightning: 'Lightning', monk: 'Monk', nature: 'Nature', ranger: 'Ranger',
  shadow: 'Shadow', thief: 'Thief', warrior: 'Warrior', item: 'Item',
}

const TREE_ORDER = ['warrior', 'ranger', 'thief', 'monk', 'chaos', 'cold', 'fire', 'light', 'lightning', 'nature', 'shadow', 'item']

function cleanDesc(desc) {
  if (!desc) return ''
  return desc
    .replace(/\{STA=([^}]+)\}/g, '$1')
    .replace(/@([^@]+)@/g, '$1')
    .replace(/\*0/g, 'X')
}

function SkillCard({ guid, value, skillName, displayName, description, refData, might, charLevel, onToggle }) {
  const icon = getSkillIconForName(skillName)
  const parsed = parseSkillName(skillName)
  const learned = value > 0
  const displayDesc = refData?.description || cleanDesc(description)
  const dmg = computeDamageRange(refData, might, charLevel)
  const title = displayName || parsed.cleanName
  const source = skillName.match(/^\[([^\]]+)\]/)?.[1] || null
  // Item-granted skills fall back to reference data for tier/type
  const tier = parsed.tier ?? refData?.tier ?? null
  const type = parsed.type || (refData?.type ? (refData.type === 'active' ? 'Active' : 'Passive') : null)

  const tipParts = [title]
  if (type) tipParts.push(`Tier ${tier} · ${type}`)
  if (refData?.skillPointCost) tipParts.push(`Cost: ${refData.skillPointCost} skill point(s)`)
  tipParts.push('')
  if (displayDesc) tipParts.push(displayDesc)
  if (dmg) {
    tipParts.push('')
    const dmgStr = dmg.min === dmg.max
      ? `${dmg.min} ${dmg.type} damage`
      : `${dmg.min}-${dmg.max} ${dmg.type} damage`
    tipParts.push(`${dmgStr} (${dmg.powerType} Power)`)
  }
  if (refData) {
    const stats = []
    if (refData.manaCost) stats.push(`Mana: ${refData.manaCost}`)
    if (refData.cooldown) stats.push(`Cooldown: ${refData.cooldown}`)
    if (refData.actionPointCost && refData.actionPointCost !== 'None') stats.push(`AP: ${refData.actionPointCost}`)
    if (refData.range) stats.push(`Range: ${refData.range}`)
    if (refData.blastRadius) stats.push(`Radius: ${refData.blastRadius}`)
    if (refData.duration && refData.duration !== 'Infinite') stats.push(`Duration: ${refData.duration}`)
    if (refData.weaponType) stats.push(`Weapon: ${refData.weaponType}`)
    if (refData.requires) stats.push(`Requires: ${refData.requires}`)
    if (stats.length) {
      tipParts.push('')
      tipParts.push(stats.join(' · '))
    }
  }
  const tooltipContent = tipParts.join('\n')

  return (
    <Tooltip content={tooltipContent}>
      <div
        className={`gear-card skill-card-grid${learned ? ' learned' : ''}`}
        onClick={() => onToggle(guid, learned ? 0 : 1)}
      >
        <div className="skill-card-top">
          {icon && <img className="skill-card-icon" src={skillIconUrl(icon.file)} alt="" loading="lazy" />}
          <div className="gear-card-name">{title}</div>
        </div>
        <div className="gear-card-meta">
          {tier != null && <span className="badge">T{tier}</span>}
          {type && <span className="badge">{type}</span>}
          {source && <span className="badge">{source}</span>}
          {refData?.skillPointCost && <span className="badge">{refData.skillPointCost} SP</span>}
          {learned ? <span className="badge badge-accent">Learned</span> : <span className="badge">Not Learned</span>}
        </div>
        {displayDesc && <div className="gear-card-effect">{displayDesc}</div>}
        {dmg && (
          <div className="skill-damage">
            {dmg.min === dmg.max
              ? `${dmg.min} ${dmg.type} dmg`
              : `${dmg.min}-${dmg.max} ${dmg.type} dmg`}
            <span className="skill-damage-src"> ({dmg.powerType} Pwr)</span>
          </div>
        )}
        {refData && (
          <div className="skill-card-stats">
            {refData.manaCost && <span className="skill-stat">MP {refData.manaCost}</span>}
            {refData.cooldown && <span className="skill-stat">CD {refData.cooldown}</span>}
            {refData.actionPointCost && refData.actionPointCost !== 'None' && <span className="skill-stat">AP {refData.actionPointCost}</span>}
            {refData.range && <span className="skill-stat">Rng {refData.range}</span>}
            {refData.blastRadius && <span className="skill-stat">Rad {refData.blastRadius}</span>}
            {refData.duration && refData.duration !== 'Infinite' && <span className="skill-stat">Dur {refData.duration}</span>}
            {refData.weaponType && <span className="skill-stat">{refData.weaponType}</span>}
          </div>
        )}
      </div>
    </Tooltip>
  )
}

export default function SkillsTab({ save, update }) {
  const attrSkills = save.AttributesAndSkills || {}
  const [activeTree, setActiveTree] = useState('warrior')
  const [skillQuery, setSkillQuery] = useState('')

  const might = useMemo(() => {
    for (const [guid, value] of Object.entries(attrSkills)) {
      const name = getSkillNameByGuid(guid)
      if (name === 'MightBase') return Number(value) || 0
    }
    return 0
  }, [attrSkills])

  const charLevel = useMemo(() => {
    return Number(save.ExperienceLevel) || 1
  }, [save])

  const { treeGroups, treeSpent } = useMemo(() => {
    const skills = []
    for (const [guid, value] of Object.entries(attrSkills)) {
      const name = getSkillNameByGuid(guid)
      if (!name) continue
      const isTreeSkill = name.match(/^[A-Z]+_\d+_[AP]\d+_/) && !name.startsWith('Enemy_') && !name.startsWith('Werewolf_') && !name.startsWith('BAS_')
      const isItemSkill = name.startsWith('[')
      if (!isTreeSkill && !isItemSkill) continue
      const parsed = parseSkillName(name)
      const desc = getSkillDescByGuid(guid)
      const ref = getSkillRefByGuid(guid)
      const displayName = getSkillDisplayNameByGuid(guid)
      // Item-granted skills keep their original tree when known (e.g. Dark Ritual -> Shadow)
      const tree = isItemSkill ? (ref?.skillTree || 'item') : parsed.tree
      skills.push({ guid, value, name, tree, desc, ref, displayName })
    }

    const groups = {}
    const spent = {}
    for (const s of skills) {
      if (!groups[s.tree]) groups[s.tree] = []
      groups[s.tree].push(s)
      if (s.value > 0 && s.tree !== 'item') {
        const cost = s.ref?.skillPointCost || (s.ref?.tier >= 5 ? 3 : s.ref?.tier === 4 ? 2 : 1)
        spent[s.tree] = (spent[s.tree] || 0) + cost
      }
    }
    for (const t of Object.keys(groups)) groups[t].sort((a, b) => a.name.localeCompare(b.name))

    return { treeGroups: groups, treeSpent: spent }
  }, [attrSkills])

  const treeNames = TREE_ORDER.filter((t) => treeGroups[t])
  const currentSkills = (treeGroups[activeTree] || []).filter((s) => {
    if (!skillQuery) return true
    const q = skillQuery.toLowerCase()
    const parsed = parseSkillName(s.name)
    return (
      parsed.cleanName.toLowerCase().includes(q) ||
      (s.displayName || '').toLowerCase().includes(q) ||
      (s.desc || '').toLowerCase().includes(q) ||
      (s.ref?.description || '').toLowerCase().includes(q)
    )
  })

  const setSkillValue = (guid, value) => {
    update(['AttributesAndSkills', guid], value)
  }

  return (
    <div className="panel">
      <div className="grid-header">
        <h2 className="section-title">Skills</h2>
        <input
          className="search-input grid-search"
          type="text"
          placeholder="Search skill..."
          value={skillQuery}
          onChange={(e) => setSkillQuery(e.target.value)}
        />
      </div>

      <div className="skill-sub-tabs">
        {treeNames.map((t) => (
          <button
            key={t}
            className={`skill-sub-tab${activeTree === t ? ' active' : ''}`}
            onClick={() => setActiveTree(t)}
          >
            {TREE_LABELS[t] || t}
            <span className="skill-sub-count">
              {t === 'item' ? `${(treeGroups[t] || []).length} skills` : `${treeSpent[t] || 0} SP`}
            </span>
          </button>
        ))}
      </div>

      <div className="skill-card-grid-3">
        {currentSkills.map((s) => (
          <SkillCard
            key={s.guid}
            guid={s.guid}
            value={s.value}
            skillName={s.name}
            displayName={s.displayName}
            description={s.desc}
            refData={s.ref}
            might={might}
            charLevel={charLevel}
            onToggle={setSkillValue}
          />
        ))}
      </div>
      {currentSkills.length === 0 && <div className="empty-hint">No skills in this tree.</div>}
    </div>
  )
}
