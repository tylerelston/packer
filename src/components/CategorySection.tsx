import { AnimatePresence, motion } from "framer-motion"
import { Trash2 } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { cn } from "@/lib/utils"
import {
  LAST_MINUTE_CATEGORY,
  type LayoutMode,
  type PackingItem as PackingItemType,
} from "@/types/schema"

import { PackingItem } from "./PackingItem"


type CategorySectionProps = {
  title: string
  items: PackingItemType[]
  onToggle: (id: string) => void
  onDelete?: (id: string) => void
  onItemDrop?: (itemId: string, category: string) => void
  layout?: LayoutMode
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  onDeleteCategory?: (category: string) => void
}


export function CategorySection({
  title,
  items,
  onToggle,
  onDelete,
  onItemDrop,
  layout = "column",
  onDragStart,
  onDragEnd,
  onDeleteCategory,
}: CategorySectionProps) {
  const checkedCount = items.reduce(
    (count, item) => count + (item.checked ? 1 : 0),
    0
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const isRow = layout === "row"

  const isLastMinute =
    title.toLowerCase() === LAST_MINUTE_CATEGORY.toLowerCase() ||
    title.toLowerCase() === "last minute"

  return (
    <Card
      className={cn(
        "group/card h-full border-zinc-700/70 bg-zinc-900/55 py-2 transition-all",
        isDragOver && "ring-1 ring-zinc-400/70",
        isLastMinute && "border-primary-yellow/30 bg-primary-yellow/[0.03]",
      )}
      onDragOver={(event) => {
        if (!onItemDrop) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        if (!onItemDrop) return
        event.preventDefault()
        const id = event.dataTransfer.getData("text/plain")
        if (id) onItemDrop(id, title)
        setIsDragOver(false)
        onDragEnd?.()
      }}
    >
      {isRow ? (
        <CardContent className="px-3 py-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">
                {title}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "border-zinc-800 px-1.5 py-0 text-[10px] text-zinc-300",
                  checkedCount === items.length &&
                    items.length > 0 &&
                    "border-primary-green/50 text-primary-green",
                  isLastMinute && "border-primary-yellow/40 text-primary-yellow",
                )}
              >
                {checkedCount}/{items.length}
              </Badge>
              {onDeleteCategory && (
                <DeleteCategoryButton
                  title={title}
                  itemCount={items.length}
                  onDelete={() => onDeleteCategory(title)}
                />
              )}
            </div>
            <motion.div layout className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <PackingItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </CardContent>
      ) : (
        <>
          <CardHeader className="px-3 pb-1.5 pt-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">
                {title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <Badge
                  variant="outline"
                  className={cn(
                    "border-zinc-800 px-1.5 py-0 text-[10px] text-zinc-300",
                    checkedCount === items.length &&
                      items.length > 0 &&
                      "border-primary-green/50 text-primary-green",
                    isLastMinute && "border-primary-yellow/40 text-primary-yellow",
                  )}
                >
                  {checkedCount}/{items.length}
                </Badge>
                {onDeleteCategory && (
                  <DeleteCategoryButton
                    title={title}
                    itemCount={items.length}
                    onDelete={() => onDeleteCategory(title)}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-1 pt-0">
            <motion.div layout className="grid gap-1">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <PackingItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </CardContent>
        </>
      )}
    </Card>
  )
}

function DeleteCategoryButton({
  title,
  itemCount,
  onDelete,
}: {
  title: string
  itemCount: number
  onDelete: () => void
}) {
  const trigger = (
    <button
      className="ml-1 opacity-0 transition-opacity hover:text-red-400 group-hover/card:opacity-100"
      aria-label={`Delete ${title} category`}
    >
      <Trash2 className="h-3 w-3" />
    </button>
  )

  if (itemCount === 0) {
    return <div onClick={onDelete}>{trigger}</div>
  }

  return (
    <ConfirmDialog
      trigger={trigger}
      title="Delete category?"
      description={
        <>
          This will permanently delete{" "}
          <span className="font-medium text-zinc-100">"{title}"</span> and all{" "}
          <span className="font-medium text-zinc-100">{itemCount} items</span>. This action
          cannot be undone.
        </>
      }
      confirmText="Delete Everything"
      cancelText="Cancel"
      onConfirm={onDelete}
      variant="destructive"
    />
  )
}

