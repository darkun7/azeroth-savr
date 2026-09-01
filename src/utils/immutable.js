/**
 * Immutably set a nested value by path (array of keys/indices).
 * Returns a new object/array with the mutation applied.
 */
export function setIn(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const isArrayTarget = Array.isArray(obj)

  const current = obj[head] === undefined || obj[head] === null ? null : obj[head]

  const next = setIn(current, rest, value)

  if (isArrayTarget) {
    const cloned = obj.slice()
    cloned[head] = next
    return cloned
  }
  return { ...obj, [head]: next }
}
