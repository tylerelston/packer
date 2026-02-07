import { DEFAULT_CATEGORY, type PackingItem } from "@/types/schema"

/**
 * Converts a string to title case
 */
export const titleCase = (value: string) =>
  value
    .replace(/(?:^|[\s-/])\w/g, (match) => match.toUpperCase())
    .replace(/(\w)(\w*)/g, (_, first, rest) => first + rest.toLowerCase())
    .replace(/(?:^|[\s-/])\w/g, (match) => match.toUpperCase())

/**
 * Normalizes a category name to a consistent format
 */
export const normalizeCategoryName = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_CATEGORY
  if (trimmed.toLowerCase() === "general") return DEFAULT_CATEGORY
  return titleCase(trimmed)
}

/**
 * Normalizes a list of category names
 */
export const normalizeCategoryList = (list: unknown) => {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => (typeof entry === "string" ? normalizeCategoryName(entry) : ""))
    .filter((entry) => entry)
}

/**
 * Ensures DEFAULT_CATEGORY is always first in the list
 */
export const ensureDefaultFirst = (list: string[]) => {
  const without = list.filter((category) => category !== DEFAULT_CATEGORY)
  return [DEFAULT_CATEGORY, ...without]
}

/**
 * Merges two category lists, removing duplicates while preserving order
 */
export const mergeCategories = (base: string[], incoming: string[]) => {
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

/**
 * Checks if two category lists are equal
 */
export const areListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

/**
 * Extracts unique categories from a list of items
 */
export const getCategoriesFromItems = (items: PackingItem[]) => {
  const unique = new Set<string>()
  for (const item of items) {
    unique.add(normalizeCategoryName(item.category))
  }
  return [...unique]
}

/**
 * Gets the canonical category order based on items and existing categories
 */
export const getCategoryOrder = (items: PackingItem[], categories: string[]) =>
  ensureDefaultFirst(mergeCategories(categories, getCategoriesFromItems(items)))
