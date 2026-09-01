import { useState, useRef } from 'react'

export default function ConfirmButton({ onConfirm, children, className = 'btn btn-sm btn-danger', timeout = 2500 }) {
  const [armed, setArmed] = useState(false)
  const timer = useRef(null)

  const handleClick = (e) => {
    e.stopPropagation()
    if (armed) {
      clearTimeout(timer.current)
      setArmed(false)
      onConfirm()
    } else {
      setArmed(true)
      timer.current = setTimeout(() => setArmed(false), timeout)
    }
  }

  return (
    <button
      className={`${className}${armed ? ' confirm-armed' : ''}`}
      onClick={handleClick}
    >
      {armed ? 'Confirm Delete' : children}
    </button>
  )
}
