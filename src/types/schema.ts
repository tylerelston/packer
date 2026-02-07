// Core types
export type PackingCategory = {
  id: string
  label: string
}

export type PackingItem = {
  id: string
  name: string
  category: string
  checked: boolean
  order: number
}

// UI types
export type LayoutMode = "column" | "row"

export type ItemState = "checked" | "unchecked"

export type CategoryType = "default" | "last-minute" | "custom"

// Stats types
export type PackingStats = {
  total: number
  checked: number
  progress: number
}

// Category grouping
export type CategoryGroup = {
  category: string
  items: PackingItem[]
}

// Parsed input types
export type ParsedItem = {
  name: string
  category: string
}

// Share result
export type ShareResult = {
  url: string
  copied: boolean
}

// Category query for autocomplete
export type CategoryQuery = {
  query: string
  start: number
  end: number
}

// Constants
export const DEFAULT_CATEGORY = "Uncategorized"
export const LAST_MINUTE_CATEGORY = "Last-Minute"
