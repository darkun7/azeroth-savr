import { useRef, useState, useCallback, cloneElement, isValidElement } from 'react'

export default function Tooltip({ content, children }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timer = useRef(null)
  const ref = useRef(null)

  const handleEnter = useCallback(() => {
    timer.current = setTimeout(() => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const tipWidth = 300
      let x = rect.left + rect.width / 2 - tipWidth / 2
      x = Math.max(8, Math.min(x, window.innerWidth - tipWidth - 8))
      const y = rect.top - 8
      setPos({ x, y })
      setShow(true)
    }, 400)
  }, [])

  const handleLeave = useCallback(() => {
    clearTimeout(timer.current)
    setShow(false)
  }, [])

  if (!content || !isValidElement(children)) return children

  const child = children
  const childProps = {
    ref: (el) => {
      ref.current = el
      if (typeof child.ref === 'function') child.ref(el)
      else if (child.ref) child.ref.current = el
    },
    onMouseEnter: (e) => {
      handleEnter()
      child.props.onMouseEnter?.(e)
    },
    onMouseLeave: (e) => {
      handleLeave()
      child.props.onMouseLeave?.(e)
    },
  }

  return (
    <>
      {cloneElement(child, childProps)}
      {show && (
        <div
          className="custom-tooltip"
          style={{ left: pos.x, top: pos.y, transform: 'translateY(-100%)' }}
        >
          {content}
        </div>
      )}
    </>
  )
}
