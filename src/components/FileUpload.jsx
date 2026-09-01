import { useMemo, useRef, useState } from 'react'

const DEFAULT_PATH = 'C:\\Users\\{user}\\AppData\\LocalLow\\Burst2Flame Entertainment\\Stolen Realm'

export default function FileUpload({ onUpload, hasFile, fileName }) {
  const [dragging, setDragging] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [savePath, setSavePath] = useState(DEFAULT_PATH)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (files) => {
    const file = files?.[0]
    if (file) {
      onUpload(file)
      setCollapsed(true)
    }
  }

  const dropProps = useMemo(
    () => ({
      onClick: () => inputRef.current?.click(),
      onDragOver: (e) => {
        e.preventDefault()
        setDragging(true)
      },
      onDragLeave: () => setDragging(false),
      onDrop: (e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      },
    }),
    []
  )

  const copyPath = (e) => {
    e.stopPropagation()
    const text = savePath.replace('{user}', '')
    navigator.clipboard?.writeText(savePath).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (hasFile && collapsed) {
    return (
      <div className="upload-collapsed">
        <span>
          Loaded: <span className="file-label">{fileName}</span>
        </span>
        <button className="btn btn-sm" onClick={() => setCollapsed(false)}>
          Replace
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className={`upload-box${dragging ? ' dragging' : ''}`} {...dropProps}>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {hasFile ? (
          <>
            <p>
              Current save: <span className="file-label">{fileName}</span>
            </p>
            <p className="upload-meta">Click or drop a different file to replace it.</p>
          </>
        ) : (
          <>
            <p>Drag &amp; drop your save file here, or click to <span className="file-label">browse</span></p>
            <p className="upload-meta">Accepts <code>.json</code> save files (e.g. Character00.json)</p>
          </>
        )}
      </div>
      {!hasFile && (
        <div className="save-path-row">
          <label className="save-path-label">Save data location:</label>
          <input
            className="search-input save-path-input"
            type="text"
            value={savePath}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setSavePath(e.target.value)}
          />
          <button className="btn btn-sm" onClick={copyPath}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
