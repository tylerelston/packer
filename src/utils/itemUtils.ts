import { v4 as uuidv4 } from "uuid"
import { DEFAULT_CATEGORY, type PackingItem, type ParsedItem } from "@/types/schema"
import { normalizeCategoryName, getCategoryOrder } from "./categoryUtils"

/**
 * Creates a new packing item with a unique ID
 */
export const createItem = (
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

/**
 * Normalizes a partial item to a valid PackingItem
 */
export const normalizeItem = (item: Partial<PackingItem>): PackingItem | null => {
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

/**
 * Normalizes an array of partial items
 */
export const normalizeItems = (items: Partial<PackingItem>[]) =>
  items
    .map((entry) => normalizeItem(entry))
    .filter((entry): entry is PackingItem => Boolean(entry))

/**
 * Sorts items by category order, then by checked status, then by order
 */
export const sortItems = (items: PackingItem[], categories: string[]) => {
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

/**
 * Parses a single line of input into items
 * Supports format: "Item1, Item2 #Category" or "#Category Item1, Item2"
 */
export const parseLine = (line: string): ParsedItem[] => {
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

/**
 * Parses multi-line input into items
 */
export const parseInput = (input: string): ParsedItem[] => {
  const lines = input.split(/\r?\n/)
  return lines.flatMap((line) => parseLine(line))
}
