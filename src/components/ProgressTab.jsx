import { useState } from 'react'
import ConfirmButton from './ConfirmButton.jsx'

const COLOR_LABELS = ['Hair', 'Skin', 'Facial Feature (Head)', 'Eye Color']

const VISUAL_SLOTS = [
  { key: 'hair', label: 'Hair', prefix: 'Chr_Hair_', maleCount: 39, femaleCount: 39 },
  { key: 'head', label: 'Head', prefix: 'Chr_Head_Male_', maleCount: 23, femaleCount: 22, femalePrefix: 'Chr_Head_Female_' },
  { key: 'eyebrow', label: 'Eyebrow', prefix: 'Chr_Eyebrow_Male_', maleCount: 10, femaleCount: 7, femalePrefix: 'Chr_Eyebrow_Female_' },
  { key: 'facialHair', label: 'Facial Hair', prefix: 'Chr_FacialHair_Male_', maleCount: 18, femaleCount: 0 },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function visualOptions(slot, isMale) {
  const count = isMale ? slot.maleCount : slot.femaleCount
  const prefix = !isMale && slot.femalePrefix ? slot.femalePrefix : slot.prefix
  const opts = []
  for (let i = 1; i <= count; i++) {
    const val = `${prefix}${pad(i)}`
    opts.push({ value: val, label: `${slot.label} ${pad(i)}` })
  }
  return opts
}

function matchVisualSlot(value, slot, isMale) {
  if (!value) return ''
  const prefix = !isMale && slot.femalePrefix ? slot.femalePrefix : slot.prefix
  if (value.startsWith(prefix)) {
    const num = value.slice(prefix.length)
    if (/^\d+$/.test(num)) return value
  }
  return ''
}

function VisualEditor({ save, update }) {
  const isMale = save.IsMale !== false
  const visuals = save.ActiveVisuals || []

  const getSlotValue = (slotIndex) => {
    const slot = VISUAL_SLOTS[slotIndex]
    if (!slot) return ''
    const val = visuals[slotIndex] || ''
    return matchVisualSlot(val, slot, isMale) || ''
  }

  const setSlotValue = (slotIndex, value) => {
    const next = [...visuals]
    while (next.length < VISUAL_SLOTS.length) next.push('')
    next[slotIndex] = value
    update(['ActiveVisuals'], next)
  }

  return (
    <div className="panel">
      <h2 className="section-title">Active Visuals</h2>
      <p className="empty-hint">Character appearance ({isMale ? 'Male' : 'Female'}).</p>
      <div className="field-grid">
        {VISUAL_SLOTS.map((slot, idx) => {
          const options = visualOptions(slot, isMale)
          if (options.length === 0) {
            return (
              <div className="field" key={slot.key}>
                <label>{slot.label}</label>
                <select disabled>
                  <option>None available</option>
                </select>
              </div>
            )
          }
          return (
            <div className="field" key={slot.key}>
              <label>{slot.label}</label>
              <select
                value={getSlotValue(idx)}
                onChange={(e) => setSlotValue(idx, e.target.value)}
              >
                <option value="">None</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StringListEditor({ label, items = [], path, update, hint, allowAdd = true }) {
  const [newValue, setNewValue] = useState('')
  const add = () => {
    if (!newValue.trim()) return
    update(path, [...items, newValue.trim()])
    setNewValue('')
  }
  const remove = (i) => update(path, items.filter((_, idx) => idx !== i))
  return (
    <div className="panel">
      <h2 className="section-title">{label} ({items.length})</h2>
      {hint && <p className="empty-hint">{hint}</p>}
      {items.length === 0 && <div className="empty-hint">Empty.</div>}
      <div className="pills">
        {items.map((it, i) => (
          <div className="pill" key={i}>
            <input
              className="pill-input"
              type="text"
              value={it ?? ''}
              onChange={(e) => update([...path, i], e.target.value)}
            />
            {allowAdd && (
              <ConfirmButton onConfirm={() => remove(i)}>
                ×
              </ConfirmButton>
            )}
          </div>
        ))}
      </div>
      {allowAdd && (
        <div className="kv-add">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="New value..."
          />
          <button className="btn btn-sm" onClick={add}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProgressTab({ save, update }) {
  const colors = save.ChosenColors || []

  return (
    <div>
      <div className="panel">
        <h2 className="section-title">Colors ({colors.length})</h2>
        <p className="empty-hint">Order: Hair, Skin, Facial Feature (Head), Eye Color.</p>
        <div className="color-grid">
          {colors.map((hex, i) => (
            <div className="color-field" key={i}>
              <input
                type="color"
                value={`#${hex}`}
                onChange={(e) => update(['ChosenColors', i], e.target.value.slice(1))}
              />
              <div className="color-meta">
                <label>{COLOR_LABELS[i] || `Color ${i + 1}`}</label>
                <input
                  type="text"
                  value={hex}
                  maxLength={6}
                  onChange={(e) => update(['ChosenColors', i], e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <VisualEditor save={save} update={update} />
    </div>
  )
}
