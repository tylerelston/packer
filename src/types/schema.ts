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

export const DEFAULT_CATEGORY = "Uncategorized"
export const LAST_MINUTE_CATEGORY = "Last-Minute"
