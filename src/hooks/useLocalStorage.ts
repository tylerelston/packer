import { useCallback, useState } from "react"

/**
 * Generic hook for managing localStorage with React state
 */
export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  const readValue = useCallback(() => {
    if (typeof window === "undefined") {
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item
        ? (JSON.parse(item) as T)
        : typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue
    } catch {
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue
    }
  }, [key, initialValue])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((current) => {
        const next = value instanceof Function ? value(current) : value
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(next))
          } catch {
            // ignore write errors
          }
        }
        return next
      })
    },
    [key]
  )

  return [storedValue, setValue] as const
}
