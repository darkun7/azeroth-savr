import { useMemo, useState } from 'react'
import { getSkillNameByGuid, STATS_KEYS, GOLD_XP_KEYS } from '../utils/data.js'

function NumRow({ label, value, onChange }) {
  return (
    <div className="kv-card">
      <span className="kv-card-key" style={{ fontSize: 13 }}>{label}</span>
      <input
        type="number"
        step="any"
        className="kv-card-val"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </div>
  )
}

export default function StatsTab({ save, update }) {
  const attrSkills = save.AttributesAndSkills || {}
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const { statEntries, goldXpEntries, advancedEntries } = useMemo(() => {
    const stats = []
    const goldXp = []
    const advanced = []

    for (const [guid, value] of Object.entries(attrSkills)) {
      const name = getSkillNameByGuid(guid)
      const isSkill = name && name.match(/^[A-Z]+_\d+_[AP]\d+_/) && !name.startsWith('Enemy_') && !name.startsWith('Werewolf_') && !name.startsWith('BAS_')
      if (isSkill) continue
      if (STATS_KEYS.includes(name || guid)) {
        stats.push({ key: name || guid, value })
      } else if (GOLD_XP_KEYS.includes(name || guid)) {
        goldXp.push({ key: name || guid, value })
      } else {
        advanced.push({ guid, value, name: name || guid })
      }
    }

    return { statEntries: stats, goldXpEntries: goldXp, advancedEntries: advanced }
  }, [attrSkills])

  const setStatValue = (key, value) => update(['AttributesAndSkills', key], value)
  const setAdvancedValue = (guid, value) => update(['AttributesAndSkills', guid], value)

  return (
    <div>
      <div className="panel">
        <h2 className="section-title">Base Stats</h2>
        <div className="kv-grid">
          {statEntries.map((s) => (
            <NumRow key={s.key} label={s.key} value={s.value} onChange={(v) => setStatValue(s.key, v)} />
          ))}
        </div>
        {statEntries.length === 0 && <div className="empty-hint">No stats found.</div>}
      </div>

      <div className="panel">
        <h2 className="section-title">Gold &amp; XP</h2>
        <div className="kv-grid">
          {goldXpEntries.map((s) => (
            <NumRow key={s.key} label={s.key} value={s.value} onChange={(v) => setStatValue(s.key, v)} />
          ))}
        </div>
        {goldXpEntries.length === 0 && <div className="empty-hint">No Gold/XP found.</div>}
      </div>

      <div className="panel">
        <button
          className="btn btn-sm"
          onClick={() => setAdvancedOpen((v) => !v)}
          style={{ marginBottom: advancedOpen ? 12 : 0 }}
        >
          {advancedOpen ? '▼' : '▶'} Advanced Attributes ({advancedEntries.length})
        </button>
        {advancedOpen && (
          <div className="kv-grid">
            {advancedEntries.map((e) => (
              <NumRow key={e.guid} label={e.name} value={e.value} onChange={(v) => setAdvancedValue(e.guid, v)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
