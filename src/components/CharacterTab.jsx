import Toggle from './Toggle.jsx'

function BoolField({ label, save, path, update }) {
  const value = path.reduce((o, k) => (o ? o[k] : undefined), save)
  return (
    <Toggle
      checked={!!value}
      onChange={(v) => update(path, v)}
      label={label}
    />
  )
}

function NumField({ label, path, save, update, step }) {
  const value = path.reduce((o, k) => (o ? o[k] : undefined), save)
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        step={step ?? 'any'}
        value={value ?? ''}
        onChange={(e) => update(path, e.target.value === '' ? null : Number(e.target.value))}
      />
    </div>
  )
}

function TextField({ label, path, save, update, disabled }) {
  const value = path.reduce((o, k) => (o ? o[k] : undefined), save)
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="text"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => update(path, e.target.value)}
      />
    </div>
  )
}

export default function CharacterTab({ save, update }) {
  return (
    <div>
      <div className="panel">
        <h2 className="section-title">Identity</h2>
        <div className="field-grid">
          <TextField label="Character Name" path={['CharacterName']} save={save} update={update} />
          <TextField label="GUID" path={['Guid']} save={save} update={update} disabled />
          <TextField label="Character Preset File GUID" path={['CharacterPresetFileGuid']} save={save} update={update} disabled />
          <TextField label="Last Time Played" path={['LastTimePlayedString']} save={save} update={update} disabled />
        </div>
      </div>

      <div className="panel">
        <h2 className="section-title">Progression</h2>
        <div className="field-grid">
          <NumField label="Experience Level" path={['ExperienceLevel']} save={save} update={update} />
          <NumField label="Highest Completed Level" path={['HighestCompletedLevel']} save={save} update={update} />
          <NumField label="Shop Highest Level" path={['ShopHighestLevel']} save={save} update={update} />
          <NumField label="Last Selected Level Difference" path={['LastSelectedLevelDifference']} save={save} update={update} />
          <NumField label="Last Main Quest Level Completed" path={['LastMainQuestLevelCompleted']} save={save} update={update} />
          <NumField label="Last Visited Act Index" path={['LastVisitedActIndex']} save={save} update={update} />
        </div>
      </div>

      <div className="panel">
        <h2 className="section-title">Flags</h2>
        <div className="field-grid">
          <BoolField label="Hardcore" path={['IsHardcore']} save={save} update={update} />
          <BoolField label="Hardcore Death" path={['HardcoreDeath']} save={save} update={update} />
          <BoolField label="Roguelike Character" path={['IsRoguelikeCharacter']} save={save} update={update} />
          <BoolField label="Is Male" path={['IsMale']} save={save} update={update} />
          <BoolField label="Selected For Battle" path={['SelectedForBattle']} save={save} update={update} />
          <BoolField label="Deleted" path={['IsDeleted']} save={save} update={update} />
          <BoolField label="Helm Hidden" path={['HelmHidden']} save={save} update={update} />
          <BoolField label="Completed Starting Battle" path={['CompletedStartingBattle']} save={save} update={update} />
        </div>
      </div>
    </div>
  )
}
