import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"
import { URL_PARAMS } from "@/constants"
import type { PackingItem } from "@/types/schema"
import { normalizeItems } from "./itemUtils"

/**
 * Encodes items to a URL hash
 */
export const encodeItemsToHash = (items: PackingItem[]) => {
  try {
    const payload = JSON.stringify(items)
    return compressToEncodedURIComponent(payload)
  } catch {
    return ""
  }
}

/**
 * Decodes items from a URL hash
 */
export const decodeItemsFromHash = (hash: string): PackingItem[] | null => {
  if (!hash.startsWith(`#${URL_PARAMS.HASH_KEY}=`)) return null
  const encoded = hash.slice(URL_PARAMS.HASH_KEY.length + 2)
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

/**
 * Generates a shareable URL for the current items
 */
export const generateShareUrl = (items: PackingItem[]): string => {
  if (typeof window === "undefined") return ""
  if (!items.length) return window.location.href
  const encoded = encodeItemsToHash(items)
  if (!encoded) return window.location.href
  return `${window.location.origin}${window.location.pathname}#${URL_PARAMS.HASH_KEY}=${encoded}`
}

/**
 * Updates the browser URL with the current hash
 */
export const updateUrlHash = (hash: string) => {
  if (typeof window === "undefined") return
  if (hash) {
    window.history.replaceState(null, "", `${window.location.pathname}#${hash}`)
  }
}
