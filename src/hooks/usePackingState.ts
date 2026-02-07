import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"
import { v4 as uuidv4 } from "uuid"

import { DEFAULT_CATEGORY, type PackingItem } from "@/types/schema"

const STORAGE_KEY = "packer.items.v1"
const CATEGORY_KEY = "packer.categories.v1"
const HASH_KEY = "p"
const SORT_DELAY_MS = 800
const DEFAULT_CATEGORIES = [DEFAULT_CATEGORY]

const seedItems = () => {
  const now = Date.now()
  return [
    createItem("Passport", "Documents", false, now + 1),
    createItem("Phone charger", "Tech", false, now + 2),
    createItem("Socks", "Clothing", false, now + 3),
    createItem("Toothbrush", "Toiletries", false, now + 4),
    createItem("Water bottle", "Misc", false, now + 5),
  ]
}

const titleCase = (value: string) =>
  value
    .split(" ")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ")

const normalizeCategoryName = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_CATEGORY
  if (trimmed.toLowerCase() === "general") return DEFAULT_CATEGORY
  return titleCase(trimmed)
}

const normalizeCategoryList = (list: unknown) => {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => (typeof entry === "string" ? normalizeCategoryName(entry) : ""))
    .filter((entry) => entry)
}

const ensureDefaultFirst = (list: string[]) => {
  const without = list.filter((category) => category !== DEFAULT_CATEGORY)
  return [DEFAULT_CATEGORY, ...without]
}

const mergeCategories = (base: string[], incoming: string[]) => {
  const seen = new Set<string>()
  const merged: string[] = []
  const push = (value: string) => {
    const normalized = normalizeCategoryName(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    merged.push(normalized)
  }
  base.forEach(push)
  incoming.forEach(push)
  return merged
}

const areListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

const getCategoriesFromItems = (items: PackingItem[]) => {
  const unique = new Set<string>()
  for (const item of items) {
    unique.add(normalizeCategoryName(item.category))
  }
  return [...unique]
}

const getCategoryOrder = (items: PackingItem[], categories: string[]) =>
  ensureDefaultFirst(mergeCategories(categories, getCategoriesFromItems(items)))

const sortItems = (items: PackingItem[], categories: string[]) => {
  if (items.length <= 1) return items
  const order = getCategoryOrder(items, categories)
  const orderMap = new Map(order.map((category, index) => [category, index]))
  return [...items].sort((a, b) => {
    const aIndex = orderMap.get(a.category) ?? order.length
    const bIndex = orderMap.get(b.category) ?? order.length
    if (aIndex !== bIndex) return aIndex - bIndex
    if (a.checked !== b.checked) return a.checked ? 1 : -1
    return a.order - b.order
  })
}

const createItem = (
  name: string,
  category: string,
  checked = false,
  orderSeed = Date.now() + Math.random()
): PackingItem => ({
  id: uuidv4(),
  name,
  category,
  checked,
  order: orderSeed,
})

const normalizeItem = (item: Partial<PackingItem>): PackingItem | null => {
  if (!item || typeof item.name !== "string") return null
  const name = item.name.trim()
  if (!name) return null
  const rawCategory =
    typeof item.category === "string" && item.category.trim()
      ? item.category.trim()
      : DEFAULT_CATEGORY
  const category = normalizeCategoryName(rawCategory)
  return {
    id: typeof item.id === "string" && item.id ? item.id : uuidv4(),
    name,
    category,
    checked: Boolean(item.checked),
    order: typeof item.order === "number" ? item.order : Date.now() + Math.random(),
  }
}

const encodeItemsToHash = (items: PackingItem[]) => {
  try {
    const payload = JSON.stringify(items)
    return compressToEncodedURIComponent(payload)
  } catch {
    return ""
  }
}

const normalizeItems = (items: Partial<PackingItem>[]) =>
  items
    .map((entry) => normalizeItem(entry))
    .filter((entry): entry is PackingItem => Boolean(entry))

const decodeItemsFromHash = (hash: string) => {
  if (!hash.startsWith(`#${HASH_KEY}=`)) return null
  const encoded = hash.slice(HASH_KEY.length + 2)
  if (!encoded) return null
  const json = decompressFromEncodedURIComponent(encoded)
  if (!json) return null
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    const normalized = normalizeItems(parsed)
    return normalized.length ? normalized : null
  } catch {
    return null
  }
}

function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
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

const parseLine = (line: string) => {
  let working = line.trim()
  if (!working) return []

  let category = DEFAULT_CATEGORY
  const tokens = working.split(/\s+/)
  const remaining: string[] = []
  for (const token of tokens) {
    if (token.startsWith("#") && token.length > 1) {
      if (category === DEFAULT_CATEGORY) {
        category = normalizeCategoryName(token.slice(1))
      }
      continue
    }
    remaining.push(token)
  }
  working = remaining.join(" ").trim()
  if (!working) return []

  // Split by commas to support multiple items per line
  const names = working
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0)

  return names.map((name) => ({
    name,
    category,
  }))
}

export type PackingStats = {
  total: number
  checked: number
  progress: number
}

export type CategoryGroup = {
  category: string
  items: PackingItem[]
}

export function usePackingState() {
  const [items, setItems] = useLocalStorage<PackingItem[]>(STORAGE_KEY, seedItems)
  const [categoryList, setCategoryList] = useLocalStorage<string[]>(
    CATEGORY_KEY,
    DEFAULT_CATEGORIES
  )
  const sortTimeoutRef = useRef<number | null>(null)
  const hasHydratedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hasHydratedRef.current) return
    hasHydratedRef.current = true

    const decoded = decodeItemsFromHash(window.location.hash)
    if (decoded && decoded.length) {
      const normalizedCategories = normalizeCategoryList(categoryList)
      setItems(sortItems(decoded, normalizedCategories))
      setCategoryList((current) =>
        ensureDefaultFirst(
          mergeCategories(normalizeCategoryList(current), getCategoriesFromItems(decoded))
        )
      )
      return
    }

    setItems((current) => {
      const normalized = normalizeItems(current)
      const normalizedCategories = normalizeCategoryList(categoryList)
      return sortItems(normalized, normalizedCategories)
    })
    setCategoryList((current) =>
      ensureDefaultFirst(
        mergeCategories(normalizeCategoryList(current), normalizeCategoryList(DEFAULT_CATEGORIES))
      )
    )
  }, [categoryList, setCategoryList, setItems])

  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) {
        window.clearTimeout(sortTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setCategoryList((current) => {
      const normalized = ensureDefaultFirst(
        mergeCategories(normalizeCategoryList(current), getCategoriesFromItems(items))
      )
      return areListsEqual(normalized, current) ? current : normalized
    })
  }, [items, setCategoryList])

  const scheduleSort = useCallback(() => {
    if (sortTimeoutRef.current) window.clearTimeout(sortTimeoutRef.current)
    sortTimeoutRef.current = window.setTimeout(() => {
      setItems((current) =>
        sortItems(current, normalizeCategoryList(categoryList))
      )
    }, SORT_DELAY_MS)
  }, [categoryList, setItems])

  const addItems = useCallback(
    (rawInput: string) => {
      const lines = rawInput.split(/\r?\n/)
      const parsed = lines.flatMap((line) => parseLine(line))

      if (!parsed.length) return 0

      const nextItems = parsed.map((entry) =>
        createItem(entry.name, entry.category, false, Date.now() + Math.random())
      )

      setItems((current) => {
        const merged = [...current, ...nextItems]
        return sortItems(merged, normalizeCategoryList(categoryList))
      })
      setCategoryList((current) =>
        ensureDefaultFirst(
          mergeCategories(normalizeCategoryList(current), parsed.map((entry) => entry.category))
        )
      )
      return nextItems.length
    },
    [categoryList, setCategoryList, setItems]
  )

  const toggleItem = useCallback(
    (id: string) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      )
      scheduleSort()
    },
    [scheduleSort, setItems]
  )

  const deleteItem = useCallback(
    (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id))
    },
    [setItems]
  )

  const moveItemToCategory = useCallback(
    (id: string, category: string) => {
      const nextCategory = normalizeCategoryName(category || DEFAULT_CATEGORY)
      setItems((current) => {
        let changed = false
        const updated = current.map((item) => {
          if (item.id !== id) return item
          if (item.category === nextCategory) return item
          changed = true
          return {
            ...item,
            category: nextCategory,
            order: Date.now() + Math.random(),
          }
        })
        return changed
          ? sortItems(updated, normalizeCategoryList(categoryList))
          : current
      })
      setCategoryList((current) =>
        ensureDefaultFirst(
          mergeCategories(normalizeCategoryList(current), [nextCategory])
        )
      )
    },
    [categoryList, setCategoryList, setItems]
  )

  const resetItems = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
      window.history.replaceState(null, "", window.location.pathname)
    }
    setItems([])
  }, [setItems])

  const categories = useMemo(() => {
    const normalizedList = getCategoryOrder(
      items,
      normalizeCategoryList(categoryList)
    )
    return normalizedList.map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
  }, [categoryList, items])

  const stats = useMemo<PackingStats>(() => {
    const total = items.length
    const checked = items.reduce((count, item) => count + (item.checked ? 1 : 0), 0)
    const progress = total ? Math.round((checked / total) * 100) : 0

    return { total, checked, progress }
  }, [items])

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    if (!items.length) return window.location.href
    const encoded = encodeItemsToHash(items)
    if (!encoded) return window.location.href
    return `${window.location.origin}${window.location.pathname}#${HASH_KEY}=${encoded}`
  }, [items])

  const share = useCallback(async () => {
    if (typeof window === "undefined") return { url: "", copied: false }
    const url = shareUrl
    if (!url) return { url: "", copied: false }

    const hash = url.split("#")[1]
    if (hash) {
      window.history.replaceState(null, "", `${window.location.pathname}#${hash}`)
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url)
        return { url, copied: true }
      } catch {
        return { url, copied: false }
      }
    }

    return { url, copied: false }
  }, [shareUrl])

  return {
    items,
    categories,
    categoryList,
    stats,
    addItems,
    toggleItem,
    deleteItem,
    moveItemToCategory,
    resetItems,
    shareUrl,
    share,
  }
}
