export default function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-field">
      <span className="toggle-track" data-on={checked ? '' : undefined}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-thumb" />
      </span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  )
}
