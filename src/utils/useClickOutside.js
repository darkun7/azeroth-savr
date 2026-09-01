import { useEffect, useRef } from 'react'

export function useClickOutside(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open, onClose])
  return ref
}
