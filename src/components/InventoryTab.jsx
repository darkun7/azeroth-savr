import { useMemo, useState } from 'react'
import { getNameByGuid, getCategoryByName, getRarityByName, getEquipSlotLabel, rarityColor, hcColor, getItemTooltip, categoryIconUrl, getModNameByGuid, getModDescByGuid, getTierFromModIds, gearCategories } from '../utils/data.js'
import ItemEditor from './ItemEditor.jsx'
import Modal from './Modal.jsx'
import Tooltip from './Tooltip.jsx'
import ConfirmButton from './ConfirmButton.jsx'

const SLOT_ICONS = {
  0: 'hand1', 1: 'hand2', 2: 'chestplate', 3: 'head', 4: 'ring', 5: 'amulet',
}

function nowTimestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const EMPTY_ITEM = {
  ItemGuid: '',
  EquippedSlotIndex: -1,
  NumStacks: 1,
  ItemLevel: 1,
  TransmogItemGuid: null,
  ItemModID: null,
  TimeAcquiredString: nowTimestamp(),
  ItemModIDs: [],
  HardcoreSetting: 0,
}

export default function InventoryTab({ save, update }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const items = save.Items || []

  const modalOpen = adding || editingIndex !== null
  const modalTitle = adding ? 'Add Item' : editingIndex !== null ? `Edit Item` : ''

  const equipped = useMemo(() => {
    return items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.EquippedSlotIndex >= 0)
      .sort((a, b) => a.item.EquippedSlotIndex - b.item.EquippedSlotIndex)
  }, [items])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const wrapped = items.map((item, originalIndex) => ({ item, originalIndex }))
    return wrapped.filter(({ item }) => {
      const name = getNameByGuid(item.ItemGuid)
      const cat = getCategoryByName(name)
      if (catFilter !== 'all' && (!cat || cat.toLowerCase() !== catFilter)) return false
      if (q) {
        const tooltip = getItemTooltip(name) || ''
        if (!name.toLowerCase().includes(q) && !tooltip.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [items, query, catFilter])

  const upsertItem = (index, newItem) => {
    let next = [...items]
    if (index === null || index === undefined) {
      next.push(newItem)
    } else {
      next[index] = newItem
    }
    if (newItem.EquippedSlotIndex >= 0) {
      for (let i = 0; i < next.length; i++) {
        if (i === index) continue
        if (next[i].EquippedSlotIndex === newItem.EquippedSlotIndex) {
          next[i] = { ...next[i], EquippedSlotIndex: -1 }
        }
      }
    }
    update(['Items'], next)
    setEditingIndex(null)
    setAdding(false)
  }

  const removeItem = (index) => {
    update(['Items'], items.filter((_, i) => i !== index))
    if (editingIndex !== null) setEditingIndex(null)
    if (adding) setAdding(false)
  }

  const close = () => {
    setEditingIndex(null)
    setAdding(false)
  }

  const handleAdd = () => {
    EMPTY_ITEM.TimeAcquiredString = nowTimestamp()
    setAdding(true)
  }

  return (
    <div>
      {equipped.length > 0 && (
        <div className="panel">
          <h2 className="section-title">Equipped ({equipped.length})</h2>
          <div className="equipped-row">
            {equipped.map(({ item, idx }) => {
              const name = getNameByGuid(item.ItemGuid) || item.ItemGuid
              const cat = getCategoryByName(name)
              const catIcon = categoryIconUrl(cat)
              const rarity = getRarityByName(name)
              const rc = rarityColor(rarity)
              const modIds = item.ItemModIDs || []
              const tier = getTierFromModIds(modIds)
              const tooltip = getItemTooltip(name)
              const modDescs = modIds.map((g) => getModDescByGuid(g)).filter(Boolean).join('\n')
              const fullTooltip = [tooltip, modDescs].filter(Boolean).join('\n\n')
              return (
                <Tooltip content={fullTooltip} key={idx}>
                  <div className="equipped-slot" onClick={() => setEditingIndex(idx)}>
                    <div className="equipped-slot-label">{getEquipSlotLabel(item.EquippedSlotIndex)}</div>
                    <div className="equipped-slot-content">
                      {catIcon && <img className="equipped-slot-icon" src={catIcon} alt="" loading="lazy" />}
                      <span style={rc ? { color: rc } : undefined}>
                        {name}
                        {tier >= 1 && <span style={{ color: hcColor(tier), fontWeight: 700 }}> *</span>}
                      </span>
                    </div>
                  </div>
                </Tooltip>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="grid-header">
          <h2 className="section-title">Inventory ({items.length} items)</h2>
          <div className="filter-row">
            <select className="search-input grid-search" style={{ width: 'auto' }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All categories</option>
              {gearCategories.map((c) => (
                <option key={c.key} value={c.label.toLowerCase()}>{c.label}</option>
              ))}
            </select>
            <input
              className="search-input grid-search"
              type="text"
              placeholder="Search items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-sm btn-primary" onClick={handleAdd}>
              Add Item
            </button>
          </div>
        </div>

        <div className="card-grid">
          {filtered.map(({ item, originalIndex }) => {
            const name = getNameByGuid(item.ItemGuid) || item.ItemGuid
            const rarity = getRarityByName(name)
            const rc = rarityColor(rarity)
            const tooltip = getItemTooltip(name)
            const cat = getCategoryByName(name)
            const catIcon = categoryIconUrl(cat)
            const modIds = item.ItemModIDs || []
            const modNames = modIds.map((g) => getModNameByGuid(g)).filter(Boolean)
            const modDescs = modIds.map((g) => getModDescByGuid(g)).filter(Boolean).join('\n')
            const fullTooltip = [tooltip, modDescs].filter(Boolean).join('\n\n')
            const tier = getTierFromModIds(modIds)
            return (
              <Tooltip content={fullTooltip} key={originalIndex}>
                <div className="gear-card">
                  <div className="gear-card-name">
                    {catIcon && <img className="gear-card-cat-icon" src={catIcon} alt="" loading="lazy" />}
                    <span style={rc ? { color: rc } : undefined}>{name}</span>
                    {tier >= 1 && <span style={{ color: hcColor(tier), fontWeight: 700 }}> *</span>}
                  </div>
                  <div className="gear-card-meta">
                    <span className="badge">{cat || 'Item'}</span>
                    {rarity && <span className="badge" style={rc ? { color: rc, borderColor: rc } : undefined}>{rarity}</span>}
                    {modNames.map((mn, i) => <span key={i} className="badge">{mn}</span>)}
                    {item.EquippedSlotIndex >= 0 && <span className="badge badge-accent">{getEquipSlotLabel(item.EquippedSlotIndex)}</span>}
                  </div>
                  {tooltip && <div className="gear-card-effect">{tooltip}</div>}
                  <div className="gear-card-detail">
                    Lv {item.ItemLevel} · Stacks {item.NumStacks}
                  </div>
                  <div className="gear-card-actions">
                    <button className="btn btn-sm" onClick={() => setEditingIndex(originalIndex)}>
                      Edit
                    </button>
                    <ConfirmButton onConfirm={() => removeItem(originalIndex)}>
                      Delete
                    </ConfirmButton>
                  </div>
                </div>
              </Tooltip>
            )
          })}
        </div>

        {filtered.length === 0 && <div className="empty-hint">No items match.</div>}
      </div>

      {modalOpen && (
        <Modal
          title={modalTitle}
          onClose={close}
        >
          <ItemEditor
            item={adding ? EMPTY_ITEM : items[editingIndex]}
            onSave={(it) => upsertItem(adding ? null : editingIndex, it)}
            onCancel={close}
          />
        </Modal>
      )}
    </div>
  )
}
