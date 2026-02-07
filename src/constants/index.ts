export const STORAGE_KEYS = {
  ITEMS: "packer.items.v1",
  CATEGORIES: "packer.categories.v1",
} as const

export const TIMING = {
  SORT_DELAY_MS: 800,
  HINT_ROTATION_MS: 2600,
  SHARE_NOTE_DURATION_MS: 2400,
  CONFETTI_DURATION_MS: 3000,
} as const

export const URL_PARAMS = {
  HASH_KEY: "p",
} as const

export const SUGGESTED_CATEGORIES = [
  "Clothing",
  "Toiletries",
  "Tech",
  "Documents",
  "Misc",
] as const

export const INPUT_HINTS = [
  "Add items (press Enter)",
  "Socks, Shirt, Pants #Clothing",
  "#Toiletries Toothbrush, Toothpaste",
  "Passport, Boarding Pass #Documents",
  "Camera, Charger #Tech",
  "Sunscreen, Sunglasses #Misc",
  "Paste a list from your notes",
] as const

export const UI_CONSTRAINTS = {
  MAX_INPUT_HEIGHT: 96,
  MAX_AUTOCOMPLETE_SUGGESTIONS: 6,
} as const
