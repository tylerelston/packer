import { useCallback, useEffect, useMemo, useRef } from "react"

import { STORAGE_KEYS, TIMING } from "@/constants"
import {
  DEFAULT_CATEGORY,
  LAST_MINUTE_CATEGORY,
  type CategoryGroup,
  type PackingItem,
  type PackingStats,
  type ShareResult,
} from "@/types/schema"
import {
  areListsEqual,
  ensureDefaultFirst,
  getCategoriesFromItems,
  getCategoryOrder,
  mergeCategories,
  normalizeCategoryList,
  normalizeCategoryName,
} from "@/utils/categoryUtils"
import { createItem, normalizeItems, parseInput, sortItems } from "@/utils/itemUtils"
import { decodeItemsFromHash, generateShareUrl, updateUrlHash } from "@/utils/storageUtils"
import { useLocalStorage } from "./useLocalStorage"

const DEFAULT_CATEGORIES = [DEFAULT_CATEGORY, LAST_MINUTE_CATEGORY]

const seedItems = () => {
  const now = Date.now()
  return [
    createItem("Passport", "Documents", false, now + 1),
    createItem("Phone charger", "Tech", false, now + 2),
    createItem("Socks", "Clothing", false, now + 3),
    createItem("Water bottle", "Misc", false, now + 4),
    createItem("Toothbrush", LAST_MINUTE_CATEGORY, false, now + 5),
    createItem("Wallet", LAST_MINUTE_CATEGORY, false, now + 6),
  ]
}

export function usePackingState() {
  const [items, setItems] = useLocalStorage<PackingItem[]>(STORAGE_KEYS.ITEMS, seedItems)
  const [categoryList, setCategoryList] = useLocalStorage<string[]>(
    STORAGE_KEYS.CATEGORIES,
    DEFAULT_CATEGORIES
  )
  const sortTimeoutRef = useRef<number | null>(null)
  const hasHydratedRef = useRef(false)

  // Hydrate from URL hash on mount
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) {
        window.clearTimeout(sortTimeoutRef.current)
      }
    }
  }, [])

  // Sync categories with items
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
      setItems((current) => sortItems(current, normalizeCategoryList(categoryList)))
    }, TIMING.SORT_DELAY_MS)
  }, [categoryList, setItems])

  const addItems = useCallback(
    (rawInput: string) => {
      const parsed = parseInput(rawInput)

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
        current.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
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

  const deleteCategory = useCallback(
    (category: string) => {
      setItems((current) => current.filter((item) => item.category !== category))
      setCategoryList((current) => current.filter((c) => c !== category))
    },
    [setCategoryList, setItems]
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
        return changed ? sortItems(updated, normalizeCategoryList(categoryList)) : current
      })
      setCategoryList((current) =>
        ensureDefaultFirst(mergeCategories(normalizeCategoryList(current), [nextCategory]))
      )
    },
    [categoryList, setCategoryList, setItems]
  )

  const resetItems = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.ITEMS)
      } catch {
        // ignore
      }
      window.history.replaceState(null, "", window.location.pathname)
    }
    setItems([])
  }, [setItems])

  const resetToDefault = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.ITEMS)
        window.localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
      } catch {
        // ignore
      }
      window.history.replaceState(null, "", window.location.pathname)
    }
    const seeds = seedItems()
    setItems(seeds)
    setCategoryList(DEFAULT_CATEGORIES)
  }, [setCategoryList, setItems])

  const categories = useMemo<CategoryGroup[]>(() => {
    const normalizedList = getCategoryOrder(items, normalizeCategoryList(categoryList))
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

  const shareUrl = useMemo(() => generateShareUrl(items), [items])

  const share = useCallback(async (): Promise<ShareResult> => {
    if (typeof window === "undefined") return { url: "", copied: false }
    const url = shareUrl
    if (!url) return { url: "", copied: false }

    const hash = url.split("#")[1]
    if (hash) {
      updateUrlHash(hash)
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
    deleteCategory,
    moveItemToCategory,
    resetItems,
    resetToDefault,
    shareUrl,
    share,
  }
}
