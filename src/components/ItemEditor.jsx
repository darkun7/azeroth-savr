import { useCallback, useMemo, useState } from 'react'
import {
  getNameByGuid,
  getGuidByName,
  getRarityByName,
  getCategoryByName,
  getCategoryByGuid,
  searchGear,
  searchItemMods,
  getModNameByGuid,
  getModDescByGuid,
  gearCategories,
  EQUIP_SLOTS,
  formatRarity,
  rarityColor,
  hcColor,
  categoryIconUrl,
} from '../utils/data.js'
import { useClickOutside } from '../utils/useClickOutside.js'
import Tooltip from './Tooltip.jsx'
import ConfirmButton from './ConfirmButton.jsx'

function parseTimeAcquired(str) {
  if (!str) return ''
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return ''
  return `${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:${m[6]}`
}

function formatTimeAcquired(local) {
  if (!local) return ''
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return ''
  return `${m[2]}/${m[3]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`
}

function TransmogPicker({ itemGuid, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const closeDropdown = useCallback(() => setOpen(false), [])
  const ref = useClickOutside(open, closeDropdown)
  const category = getCategoryByGuid(itemGuid)
  const catFilter = category ? category.toLowerCase() : 'all'
  const results = useMemo(() => {
    const r = searchGear(query)
    if (catFilter === 'all') return r
    return r.filter((item) => item._category.toLowerCase() === catFilter)
  }, [query, catFilter])

  const transmogName = getNameByGuid(value || '')

  return (
    <div className="field">
      <label>Transmog ({category || 'select item first'})</label>
      <div className="search-box" ref={ref}>
        <input
          className="search-input"
          value={query}
          placeholder={transmogName || 'Search transmog item...'}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <div className="search-results">
            <div className="result-item" onClick={() => { onChange(null); setOpen(false); setQuery('') }}>
              <span style={{ color: 'var(--text-dim)' }}>(None)</span>
            </div>
            {results.map((r, i) => {
              const rarity = formatRarity(r.Rarity)
              const rc = rarityColor(rarity)
              const icon = categoryIconUrl(r._category)
              return (
                <div key={i} className="result-item result-icon-row" onClick={() => { onChange(getGuidByName(r.Name) || r.Name); setOpen(false); setQuery('') }}>
                  {icon && <img className="result-icon" src={icon} alt="" loading="lazy" />}
                  <span style={rc ? { color: rc } : undefined}>{r.Name}</span>
                  <span className="result-cat">[{rarity}]</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ModListEditor({ modIds, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const closeDropdown = useCallback(() => setOpen(false), [])
  const ref = useClickOutside(open, closeDropdown)
  const results = useMemo(() => searchItemMods(query), [query])
  const mods = modIds || []
  const canAdd = mods.length < 3

  const addMod = (guid) => {
    onChange([...mods, guid])
    setOpen(false)
    setQuery('')
  }

  const removeMod = (index) => {
    onChange(mods.filter((_, i) => i !== index))
  }

  return (
    <div className="field">
      <label>Item Mods ({mods.length}/3)</label>
      {mods.length > 0 && (
        <div className="pills" style={{ marginBottom: 6 }}>
          {mods.map((g, i) => {
            const mn = getModNameByGuid(g)
            const md = getModDescByGuid(g)
            return (
              <Tooltip key={i} content={md}>
                <div className="pill">
                  <span style={{ fontSize: 12 }}>{mn || g}</span>
                  <ConfirmButton onConfirm={() => removeMod(i)} className="btn btn-sm btn-danger" timeout={1500}>
                    ×
                  </ConfirmButton>
                </div>
              </Tooltip>
            )
          })}
        </div>
      )}
      {canAdd && (
        <div className="search-box" ref={ref}>
          <input
            className="search-input"
            value={query}
            placeholder="Search mod to add..."
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
          {open && (
            <div className="search-results">
              {results.length === 0 && <div className="result-item">No matches</div>}
              {results.map((r, i) => (
                <div key={i} className="result-item" title={r.Description} onClick={() => addMod(r.GUID)}>
                  {r.Name}
                  <span className="result-cat">{r.Description?.substring(0, 50)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ItemEditor({ item, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...item })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const initialCat = useMemo(() => {
    const cat = getCategoryByGuid(draft.ItemGuid)
    return cat ? cat.toLowerCase() : 'all'
  }, [])

  const [catFilter, setCatFilter] = useState(initialCat)

  const results = useMemo(() => {
    const r = searchGear(query)
    if (catFilter === 'all') return r
    return r.filter((item) => item._category.toLowerCase() === catFilter)
  }, [query, catFilter])

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const closeDropdown = useCallback(() => setOpen(false), [])
  const searchRef = useClickOutside(open, closeDropdown)

  const pickItem = (name) => {
    set('ItemGuid', getGuidByName(name) || name)
    setOpen(false)
    setQuery('')
  }

  const name = getNameByGuid(draft.ItemGuid)
  const category = getCategoryByName(name)
  const isRingOrAmulet = category === 'Ring' || category === 'Amulet'

  return (
    <div className="item-editor">
      <div className="field">
        <label>Item (search gear data)</label>
        <div className="search-box" ref={searchRef}>
          <div className="filter-row" style={{ marginBottom: 4 }}>
            <select className="search-input" style={{ width: 'auto', flexShrink: 0 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All categories</option>
              {gearCategories.map((c) => (
                <option key={c.key} value={c.label.toLowerCase()}>{c.label}</option>
              ))}
            </select>
            <input
              className="search-input"
              value={query}
              placeholder={name || 'Search item name...'}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
            />
          </div>
          {open && (
            <div className="search-results">
              {results.length === 0 && <div className="result-item">No matches</div>}
              {results.map((r, i) => {
                const rarity = formatRarity(r.Rarity)
                const rc = rarityColor(rarity)
                const icon = categoryIconUrl(r._category)
                const desc = [r['Attack Power'] && r['Attack Power'] !== '' ? `AP ${r['Attack Power']}` : '', (r['Base Stats'] || '').replace(/^\s*-\s*/gm, '').replace(/\n/g, ' ').trim(), (r['Attributes'] || '').replace(/^\s*-\s*/gm, '').replace(/\n/g, ' ').trim()].filter(Boolean).join(' · ')
                return (
                  <div key={i} className="result-item result-icon-row" title={desc || undefined} onClick={() => pickItem(r.Name)}>
                    {icon && <img className="result-icon" src={icon} alt="" loading="lazy" />}
                    <div className="result-item-text">
                      <span style={rc ? { color: rc } : undefined}>{r.Name}</span>
                      <span className="result-cat">[{rarity} · {r._category}]</span>
                      {desc && <div className="result-item-desc">{desc}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {name && (
          <div className="empty-hint">
            Selected: <span style={rarityColor(getRarityByName(name)) ? { color: rarityColor(getRarityByName(name)) } : undefined}>{name}</span>
            {' '}({draft.ItemGuid})
          </div>
        )}
      </div>

      <div className="field-grid mb-row">
        <div className="field">
          <label>Item Level</label>
          <div className="level-row">
            <input
              type="number"
              min={1}
              max={30}
              value={draft.ItemLevel ?? ''}
              onChange={(e) => set('ItemLevel', Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            />
            <button className="btn btn-sm" onClick={() => set('ItemLevel', 30)}>Max</button>
          </div>
        </div>
        <div className="field">
          <label>Stacks</label>
          <input type="number" value={draft.NumStacks ?? ''} onChange={(e) => set('NumStacks', Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Equipped Slot</label>
          <select value={draft.EquippedSlotIndex ?? -1} onChange={(e) => set('EquippedSlotIndex', Number(e.target.value))}>
            {EQUIP_SLOTS.map((s) => (
              <option key={s.index} value={s.index}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-row">
        <ModListEditor
          modIds={draft.ItemModIDs}
          onChange={(ids) => set('ItemModIDs', ids)}
        />
      </div>

      {!isRingOrAmulet && (
        <div className="field-grid mb-row">
          <TransmogPicker
            itemGuid={draft.ItemGuid}
            value={draft.TransmogItemGuid}
            onChange={(g) => set('TransmogItemGuid', g)}
          />
          <div className="field">
            <label>Time Acquired</label>
            <input
              type="datetime-local"
              step="1"
              value={parseTimeAcquired(draft.TimeAcquiredString)}
              onChange={(e) => set('TimeAcquiredString', formatTimeAcquired(e.target.value))}
            />
          </div>
        </div>
      )}

      {isRingOrAmulet && (
        <div className="field-grid mb-row">
          <div className="field">
            <label>Time Acquired</label>
            <input
              type="datetime-local"
              step="1"
              value={parseTimeAcquired(draft.TimeAcquiredString)}
              onChange={(e) => set('TimeAcquiredString', formatTimeAcquired(e.target.value))}
            />
          </div>
        </div>
      )}

      <div className="toolbar" style={{ margin: '8px 0 0' }}>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>Save</button>
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
