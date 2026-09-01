import { useCallback, useMemo, useState } from 'react'
import { searchFortunes, fortuneIconUrl, FORTUNE_SLOTS, getFortuneSlotLabel, formatRarity, rarityColor } from '../utils/data.js'
import { useClickOutside } from '../utils/useClickOutside.js'
import Modal from './Modal.jsx'
import Toggle from './Toggle.jsx'
import Tooltip from './Tooltip.jsx'
import ConfirmButton from './ConfirmButton.jsx'

const EMPTY_FORTUNE = {
  Guid: '',
  Level: 1,
  EquippedSlotIndex: -1,
  IsNew: false,
}

function fortuneData(guid) {
  return searchFortunes('').find((f) => f.GUID === guid) || null
}

function FortuneEditor({ fortune, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...fortune })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = searchFortunes(query)
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const data = fortuneData(draft.Guid)

  const closeDropdown = useCallback(() => setOpen(false), [])
  const searchRef = useClickOutside(open, closeDropdown)

  return (
    <div className="item-editor">
      <div className="field">
        <label>Fortune (search)</label>
        <div className="search-box" ref={searchRef}>
          <input
            className="search-input"
            value={query}
            placeholder={(data && data.Name) || 'Search fortune name...'}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
          />
          {open && (
            <div className="search-results">
              {results.length === 0 && <div className="result-item">No matches</div>}
              {results.map((r, i) => {
                const rarity = formatRarity(r.Rarity)
                const rc = rarityColor(rarity)
                const desc = r.Description || ''
                return (
                  <div key={i} className="result-item result-icon-row" title={desc || undefined} onClick={() => { set('Guid', r.GUID); setOpen(false); setQuery('') }}>
                    <img className="result-icon" src={fortuneIconUrl(r)} alt="" loading="lazy" />
                    <div className="result-item-text">
                      <span style={rc ? { color: rc } : undefined}>{r.Name}</span>
                      <span className="result-cat" style={rc ? { color: rc } : undefined}>[{rarity}]</span>
                      {desc && <div className="result-item-desc">{desc}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {data && (
          <div className="empty-hint fortune-effect">
            <strong>Effect:</strong> {data.Description}
          </div>
        )}
      </div>

      <div className="field-grid mb-row">
        <div className="field">
          <label>Level</label>
          <div className="level-row">
            <input type="number" min={1} max={30} value={draft.Level ?? ''} onChange={(e) => set('Level', Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
            <button className="btn btn-sm" onClick={() => set('Level', 30)}>Max</button>
          </div>
        </div>
        <div className="field">
          <label>Equipped Slot</label>
          <select value={draft.EquippedSlotIndex ?? -1} onChange={(e) => set('EquippedSlotIndex', Number(e.target.value))}>
            {FORTUNE_SLOTS.map((s) => (
              <option key={s.index} value={s.index}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Toggle
        checked={!!draft.IsNew}
        onChange={(v) => set('IsNew', v)}
        label="Is New"
      />

      <div className="toolbar" style={{ margin: '8px 0 0' }}>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>Save</button>
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function FortuneTab({ save, update }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const fortunes = save.FortuneSaveData || []

  const modalOpen = adding || editingIndex !== null
  const modalTitle = adding ? 'Add Fortune' : editingIndex !== null ? 'Edit Fortune' : ''

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return fortunes.map((f, i) => ({ f, i }))
    return fortunes
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => {
        const d = fortuneData(f.Guid)
        return (d ? d.Name : f.Guid).toLowerCase().includes(q)
      })
  }, [fortunes, query])

  const upsert = (index, val) => {
    let next = [...fortunes]
    if (index === null || index === undefined) {
      next.push(val)
    } else {
      next[index] = val
    }
    if (val.EquippedSlotIndex >= 0) {
      for (let i = 0; i < next.length; i++) {
        if (i === next.length - 1 && index === null) continue
        if (i === index) continue
        if (next[i].EquippedSlotIndex === val.EquippedSlotIndex) {
          next[i] = { ...next[i], EquippedSlotIndex: -1 }
        }
      }
    }
    update(['FortuneSaveData'], next)
    setEditingIndex(null)
    setAdding(false)
  }

  const remove = (index) => {
    update(['FortuneSaveData'], fortunes.filter((_, i) => i !== index))
    if (editingIndex !== null) setEditingIndex(null)
    if (adding) setAdding(false)
  }

  const close = () => {
    setEditingIndex(null)
    setAdding(false)
  }

  return (
    <div>
      <div className="panel">
        <div className="grid-header">
          <h2 className="section-title">Fortunes ({fortunes.length})</h2>
          <div className="filter-row">
            <input
              className="search-input grid-search"
              type="text"
              placeholder="Search fortunes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}>
              Add Fortune
            </button>
          </div>
        </div>

        <div className="card-grid">
          {filtered.map(({ f, i }) => {
            const d = fortuneData(f.Guid)
            const name = d ? d.Name : f.Guid
            const rarity = d ? formatRarity(d.Rarity) : ''
            const rc = rarityColor(rarity)
            return (
              <Tooltip content={d ? `${name}\n${rarity}\n\n${d.Description || ''}` : name} key={i}>
                <div className="gear-card">
                  <div className="fortune-head">
                    {d && <img className="fortune-icon" src={fortuneIconUrl(d)} alt="" loading="lazy" />}
                    <div className="gear-card-name" style={rc ? { color: rc } : undefined}>{name}</div>
                  </div>
                  <div className="gear-card-meta">
                    {rarity && <span className="badge" style={rc ? { color: rc, borderColor: rc } : undefined}>{rarity}</span>}
                    {f.EquippedSlotIndex >= 0 && <span className="badge badge-accent">{getFortuneSlotLabel(f.EquippedSlotIndex)}</span>}
                  </div>
                  <div className="gear-card-detail">Level {f.Level}</div>
                  {d && <div className="gear-card-effect">{d.Description}</div>}
                  <div className="gear-card-actions">
                  <button className="btn btn-sm" onClick={() => setEditingIndex(i)}>Edit</button>
                  <ConfirmButton onConfirm={() => remove(i)}>Delete</ConfirmButton>
                  </div>
                </div>
              </Tooltip>
            )
          })}
        </div>

        {filtered.length === 0 && <div className="empty-hint">No fortunes match.</div>}
      </div>

      {modalOpen && (
        <Modal title={modalTitle} onClose={close}>
          <FortuneEditor
            fortune={adding ? EMPTY_FORTUNE : fortunes[editingIndex]}
            onSave={(v) => upsert(adding ? null : editingIndex, v)}
            onCancel={close}
          />
        </Modal>
      )}
    </div>
  )
}
