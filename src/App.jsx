import { useCallback, useMemo, useRef, useState } from 'react'
import FileUpload from './components/FileUpload.jsx'
import TabNav from './components/TabNav.jsx'
import CharacterTab from './components/CharacterTab.jsx'
import InventoryTab from './components/InventoryTab.jsx'
import FortuneTab from './components/FortuneTab.jsx'
import SkillsTab from './components/SkillsTab.jsx'
import StatsTab from './components/StatsTab.jsx'
import ProgressTab from './components/ProgressTab.jsx'
import { downloadObject } from './utils/export.js'
import { setIn } from './utils/immutable.js'

const TABS = [
  { key: 'character', label: 'Character' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'fortune', label: 'Fortune' },
  { key: 'skills', label: 'Skills' },
  { key: 'stats', label: 'Stats' },
  { key: 'appearance', label: 'Appearance' },
]

export default function App() {
  const [save, setSave] = useState(null)
  const [fileName, setFileName] = useState('')
  const [tab, setTab] = useState('character')
  const [error, setError] = useState('')
  const lastTabRef = useRef(tab)

  const handleUpload = useCallback((file) => {
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data || typeof data !== 'object') throw new Error('Unsupported file: expected a JSON object')
        setSave(data)
        setFileName(file.name)
        setTab(lastTabRef.current)
      } catch (err) {
        setError(`Failed to parse file: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }, [])

  const update = useCallback(
    (path, value) => {
      setSave((s) => (s ? setIn(s, path, value) : s))
    },
    []
  )

  const handleExport = useCallback(() => {
    if (!save) return
    downloadObject(save, fileName || 'character.json')
  }, [save, fileName])

  const handleTabChange = (key) => {
    lastTabRef.current = key
    setTab(key)
  }

  const tabContent = useMemo(() => {
    if (!save) return null
    switch (tab) {
      case 'character':
        return <CharacterTab save={save} update={update} />
      case 'inventory':
        return <InventoryTab save={save} update={update} />
      case 'fortune':
        return <FortuneTab save={save} update={update} />
      case 'skills':
        return <SkillsTab save={save} update={update} />
      case 'stats':
        return <StatsTab save={save} update={update} />
      case 'appearance':
        return <ProgressTab save={save} update={update} />
      default:
        return null
    }
  }, [tab, save, update])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Azeroth Savr</h1>
        <p className="subtitle">Stolen Realms save data editor</p>
      </header>

      <FileUpload onUpload={handleUpload} hasFile={!!save} fileName={fileName} />

      {error && <div className="error-banner">{error}</div>}

      {save && (
        <>
          <div className="toolbar">
            <TabNav tabs={TABS} active={tab} onChange={handleTabChange} />
            <button className="btn btn-primary" onClick={handleExport}>
              Download Save
            </button>
          </div>
          {tabContent}
        </>
      )}

      {!save && (
        <div className="empty-state">
          <p>Upload a <code>Character00.json</code> save file to begin editing.</p>
          <p className="hint">All data is processed client-side in your browser. Nothing is uploaded to a server.</p>
        </div>
      )}
    </div>
  )
}
