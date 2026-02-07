import { useMemo, useState } from "react"
import { DEFAULT_CATEGORY, type CategoryQuery } from "@/types/schema"
import { SUGGESTED_CATEGORIES, UI_CONSTRAINTS } from "@/constants"

/**
 * Hook for managing category autocomplete functionality
 */
export function useCategoryAutocomplete(categoryList: string[]) {
  const [categoryQuery, setCategoryQuery] = useState<CategoryQuery | null>(null)

  // Merge existing categories with suggested ones
  const categorySuggestions = useMemo(() => {
    const merged = [...categoryList, ...SUGGESTED_CATEGORIES].filter(
      (category) => category !== DEFAULT_CATEGORY
    )
    const seen = new Set<string>()
    return merged.filter((category) => {
      if (seen.has(category)) return false
      seen.add(category)
      return true
    })
  }, [categoryList])

  // Filter suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    if (!categoryQuery) return []
    const query = categoryQuery.query.toLowerCase()
    return categorySuggestions
      .filter((category) => category.toLowerCase().startsWith(query))
      .slice(0, UI_CONSTRAINTS.MAX_AUTOCOMPLETE_SUGGESTIONS)
  }, [categoryQuery, categorySuggestions])

  /**
   * Updates the category query based on input value and caret position
   */
  const updateCategoryQuery = (value: string, caret: number | null) => {
    if (caret === null) {
      setCategoryQuery(null)
      return
    }
    const left = value.slice(0, caret)
    const match = /(?:^|\s)#([^\s#]*)$/.exec(left)
    if (!match) {
      setCategoryQuery(null)
      return
    }
    const start = left.lastIndexOf("#")
    setCategoryQuery({
      query: match[1] ?? "",
      start,
      end: caret,
    })
  }

  /**
   * Applies a suggestion to the input
   */
  const applySuggestion = (
    category: string,
    draft: string,
    onUpdate: (value: string, caretPosition: number) => void
  ) => {
    if (!categoryQuery) return

    const before = draft.slice(0, categoryQuery.start)
    const after = draft.slice(categoryQuery.end)
    const needsSpace = after.length === 0 || !after.startsWith(" ")
    const nextValue = `${before}#${category}${needsSpace ? " " : ""}${after}`
    const position = (before + `#${category}` + (needsSpace ? " " : "")).length

    onUpdate(nextValue, position)
    setCategoryQuery(null)
  }

  return {
    categoryQuery,
    filteredSuggestions,
    updateCategoryQuery,
    applySuggestion,
    clearQuery: () => setCategoryQuery(null),
  }
}
