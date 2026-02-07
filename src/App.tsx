import { useEffect, useRef, useState } from "react"
import { ChevronDown, RotateCcw, Share2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategorySection } from "@/components/CategorySection"
import { PackingInput } from "@/components/PackingInput"
import { usePackingState } from "@/hooks/usePackingState"
import { DEFAULT_CATEGORY } from "@/types/schema"
import { cn } from "@/lib/utils"
import { triggerCompletionConfetti } from "@/utils/celebrations"
import { TIMING } from "@/constants"

export function App() {
  const {
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
    share,
  } = usePackingState()

  const [shareNote, setShareNote] = useState("")
  const [sharing, setSharing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const lastProgressRef = useRef(stats.progress)

  // Trigger confetti when packing is complete
  useEffect(() => {
    if (stats.progress === 100 && lastProgressRef.current < 100 && stats.total > 0) {
      triggerCompletionConfetti()
    }
    lastProgressRef.current = stats.progress
  }, [stats.progress, stats.total])

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    const result = await share()
    setShareNote(result.copied ? "Link copied." : "Share URL ready.")
    window.setTimeout(() => setShareNote(""), TIMING.SHARE_NOTE_DURATION_MS)
    setSharing(false)
  }

  const uncategorized = categories.find((group) => group.category === DEFAULT_CATEGORY)
  const categorized = categories.filter((group) => group.category !== DEFAULT_CATEGORY)
  const hasAnyItems = categories.some((group) => group.items.length > 0)
  const showUncategorizedStrip = isDragging && (!uncategorized || uncategorized.items.length === 0)

  return (
    <div className="dark min-h-screen bg-zinc-900 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 pb-28">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">Travel Kit</p>
              <h1 className="text-2xl font-semibold text-zinc-50">Packer</h1>
              <p className="text-xs text-zinc-400">Tap anywhere on a card to mark it packed.</p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="border border-zinc-700/60 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                    <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 border-zinc-700 bg-zinc-900 text-zinc-100"
                >
                  <DropdownMenuItem
                    onClick={resetItems}
                    className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-50"
                  >
                    Empty List
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={resetToDefault}
                    className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-50"
                  >
                    Restore Defaults
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleShare} disabled={sharing}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-800/50 p-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{stats.checked} packed</span>
                <span>{stats.total} total</span>
              </div>
              <Progress
                value={stats.progress}
                className={cn(
                  "h-2",
                  stats.progress === 100 && "[&>[data-slot=progress-indicator]]:bg-primary-green"
                )}
              />
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge
                variant="outline"
                className={cn(
                  "border-zinc-600 text-zinc-200",
                  stats.progress === 100 && "border-primary-green/50 text-primary-green"
                )}
              >
                {stats.checked}/{stats.total} packed
              </Badge>
              {shareNote ? <span className="text-xs text-zinc-400">{shareNote}</span> : null}
            </div>
          </div>
        </header>

        <section className="space-y-3">
          {uncategorized && uncategorized.items.length > 0 ? (
            <CategorySection
              title={uncategorized.category}
              items={uncategorized.items}
              onToggle={toggleItem}
              onDelete={deleteItem}
              onItemDrop={moveItemToCategory}
              layout="row"
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              onDeleteCategory={deleteCategory}
            />
          ) : null}
          {showUncategorizedStrip ? (
            <div
              className="flex items-center justify-between rounded-full border border-dashed border-zinc-600/70 bg-zinc-900/50 px-4 py-3 text-[11px] text-zinc-300"
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
              }}
              onDrop={(event) => {
                event.preventDefault()
                const id = event.dataTransfer.getData("text/plain")
                if (id) moveItemToCategory(id, DEFAULT_CATEGORY)
                setIsDragging(false)
              }}
            >
              <span>Drop here to uncategorize</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {DEFAULT_CATEGORY}
              </span>
            </div>
          ) : null}
          {categorized.length ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {categorized.map((group) => (
                <CategorySection
                  key={group.category}
                  title={group.category}
                  items={group.items}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                  onItemDrop={moveItemToCategory}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                  onDeleteCategory={deleteCategory}
                />
              ))}
            </div>
          ) : null}
          {!hasAnyItems ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-6 text-center text-sm text-zinc-300">
              <span>No items yet. Start building your list.</span>
              <span className="text-xs text-zinc-500">
                Tip: Paste a checklist or tag a category with #.
              </span>
            </div>
          ) : null}
        </section>
      </div>

      <PackingInput categoryList={categoryList} onAddItems={addItems} />
    </div>
  )
}

export default App
