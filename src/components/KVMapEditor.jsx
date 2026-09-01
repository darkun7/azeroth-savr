import { useState } from 'react'
import ConfirmButton from './ConfirmButton.jsx'

/**
 * Generic editor for a flat key->value object (map).
 * - `obj`: the current map
 * - `path`: JSON path in the save (e.g. ['SkillSlotArrangement'])
 * - `update`: setter
 * - `valueType`: 'number' | 'text' | 'array'
 * - `entries`: optional pre-filtered array of [key, value] pairs to render (defaults to all)
 */
export default function KVMapEditor({ obj = {}, path, update, valueType = 'number', entries, knownKeys, newKeyPlaceholder = 'New key...', keyDisplayFn }) {
  const [newKey, setNewKey] = useState('')
  const allEntries = Object.entries(obj)
  const rendered = entries || allEntries

  const setEntry = (key, value) => {
    const next = { ...obj, [key]: value }
    update(path, next)
  }

  const removeEntry = (key) => {
    const next = { ...obj }
    delete next[key]
    update(path, next)
  }

  const addEntry = () => {
    if (!newKey.trim()) return
    const newVal = valueType === 'number' ? 0 : valueType === 'array' ? [] : ''
    const next = { ...obj, [newKey.trim()]: newVal }
    update(path, next)
    setNewKey('')
  }

  const coerce = (v) => {
    if (valueType === 'number') return v === '' ? 0 : Number(v)
    if (valueType === 'array') return v.split(',')
    return v
  }

  const renderValue = (key, val) => {
    const display = Array.isArray(val) ? val.join(',') : val
    if (valueType === 'array') {
      return (
        <input
          type="text"
          className="kv-card-val"
          value={display ?? ''}
          onChange={(e) => setEntry(key, coerce(e.target.value))}
          placeholder="e.g. 10,11"
        />
      )
    }
    return (
      <input
        type={valueType === 'number' ? 'number' : 'text'}
        step="any"
        className="kv-card-val"
        value={display ?? ''}
        onChange={(e) => setEntry(key, coerce(e.target.value))}
      />
    )
  }

  return (
    <div>
      <div className="kv-grid">
        {rendered.map(([key, val]) => (
          <div className="kv-card" key={key}>
            <input
              type="text"
              className="kv-card-key"
              value={keyDisplayFn ? (keyDisplayFn(key) || key) : key}
              title={keyDisplayFn && keyDisplayFn(key) ? key : undefined}
              readOnly={!!keyDisplayFn}
              onChange={(e) => {
                const next = { ...obj }
                delete next[key]
                next[e.target.value] = val
                update(path, next)
              }}
            />
            {renderValue(key, val)}
            <ConfirmButton onConfirm={() => removeEntry(key)}>
              ×
            </ConfirmButton>
          </div>
        ))}
      </div>
      {rendered.length === 0 && <div className="empty-hint">No entries.</div>}
      <div className="kv-add">
        <input
          type="text"
          placeholder={newKeyPlaceholder}
          value={newKey}
          list={knownKeys && knownKeys.length ? `kv-suggest-${path.join('-')}` : undefined}
          onChange={(e) => setNewKey(e.target.value)}
        />
        {knownKeys && knownKeys.length > 0 && (
          <datalist id={`kv-suggest-${path.join('-')}`}>
            {knownKeys.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        )}
        <button className="btn btn-sm" onClick={addEntry}>
          Add
        </button>
      </div>
    </div>
  )
}
