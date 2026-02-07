import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { INPUT_HINTS, TIMING, UI_CONSTRAINTS } from "@/constants"
import { useCategoryAutocomplete } from "@/hooks/useCategoryAutocomplete"

type PackingInputProps = {
  categoryList: string[]
  onAddItems: (input: string) => number
}

export function PackingInput({ categoryList, onAddItems }: PackingInputProps) {
  const [draft, setDraft] = useState("")
  const [activeHint, setActiveHint] = useState(0)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const highlighterRef = useRef<HTMLDivElement>(null)

  const {
    categoryQuery,
    filteredSuggestions,
    updateCategoryQuery,
    applySuggestion,
    clearQuery,
  } = useCategoryAutocomplete(categoryList)

  const hints = useMemo(() => [...INPUT_HINTS], [])

  // Rotate hints
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHint((current) => (current + 1) % hints.length)
    }, TIMING.HINT_ROTATION_MS)
    return () => window.clearInterval(timer)
  }, [hints.length])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current
    const highlighter = highlighterRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    const next = Math.min(textarea.scrollHeight, UI_CONSTRAINTS.MAX_INPUT_HEIGHT)
    textarea.style.height = `${next}px`
    if (highlighter) highlighter.style.height = `${next}px`
  }, [draft])

  const handleAdd = () => {
    const added = onAddItems(draft)
    if (added > 0) {
      setDraft("")
      clearQuery()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData("text")
    if (text.includes("\n")) {
      event.preventDefault()
      onAddItems(text)
      setDraft("")
      clearQuery()
    }
  }

  const handleApplySuggestion = (category: string) => {
    applySuggestion(category, draft, (nextValue, position) => {
      setDraft(nextValue)
      window.requestAnimationFrame(() => {
        const input = inputRef.current
        if (!input) return
        input.setSelectionRange(position, position)
        input.focus()
      })
    })
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-2xl">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-900/80 p-2 shadow-lg shadow-black/30 backdrop-blur">
          <div className="relative flex-1">
            {/* Syntax highlighter overlay */}
            <div
              ref={highlighterRef}
              aria-hidden="true"
              className="no-scrollbar pointer-events-none absolute inset-0 overflow-y-auto whitespace-pre-wrap break-words border border-transparent px-4 py-2 text-xs leading-[1.4] text-zinc-100"
            >
              {draft.split(/(#\w+)/g).map((part, i) =>
                part.startsWith("#") && part.length > 1 ? (
                  <span
                    key={i}
                    className="rounded bg-zinc-700/50 text-zinc-50 ring-1 ring-zinc-600/50"
                  >
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
              {draft.endsWith("\n") ? "\n" : ""}
            </div>

            {/* Actual input */}
            <textarea
              ref={inputRef}
              value={draft}
              rows={1}
              onChange={(event) => {
                setDraft(event.target.value)
                updateCategoryQuery(event.target.value, event.target.selectionStart)
              }}
              onScroll={(event) => {
                if (highlighterRef.current) {
                  highlighterRef.current.scrollTop = event.currentTarget.scrollTop
                }
              }}
              onClick={(event) => {
                const target = event.target as HTMLTextAreaElement
                updateCategoryQuery(target.value, target.selectionStart)
              }}
              onSelect={(event) => {
                const target = event.target as HTMLTextAreaElement
                updateCategoryQuery(target.value, target.selectionStart)
              }}
              onBlur={() => clearQuery()}
              onPaste={handlePaste}
              onKeyDown={(event) => {
                if (event.key === "Tab" && filteredSuggestions.length) {
                  event.preventDefault()
                  handleApplySuggestion(filteredSuggestions[0]!)
                  return
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleAdd()
                }
              }}
              onKeyUp={(event) => {
                const target = event.currentTarget
                updateCategoryQuery(target.value, target.selectionStart)
              }}
              placeholder=""
              className="no-scrollbar h-9 max-h-24 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-xs leading-[1.4] text-transparent caret-zinc-100 outline-none placeholder:text-zinc-500"
            />

            {/* Animated hints */}
            {draft.length === 0 ? (
              <div className="pointer-events-none absolute inset-y-0 left-4 right-4 flex items-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeHint}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-xs text-zinc-500"
                  >
                    {hints[activeHint]}
                  </motion.span>
                </AnimatePresence>
              </div>
            ) : null}

            {/* Autocomplete suggestions */}
            {categoryQuery && filteredSuggestions.length ? (
              <div className="absolute bottom-full left-0 z-40 mb-2 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-1 shadow-xl shadow-black/40">
                {filteredSuggestions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-zinc-800/70"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      handleApplySuggestion(category)
                    }}
                  >
                    <span>{category}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      Tab
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button onClick={handleAdd} className="h-9 rounded-full px-4 text-xs">
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
