import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { PackingItem as PackingItemType } from "@/types/schema"

import { PackingItem } from "./PackingItem"

type CategorySectionProps = {
  title: string
  items: PackingItemType[]
  onToggle: (id: string) => void
  onDelete?: (id: string) => void
  onItemDrop?: (itemId: string, category: string) => void
  layout?: "column" | "row"
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
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
}: CategorySectionProps) {
  const checkedCount = items.reduce(
    (count, item) => count + (item.checked ? 1 : 0),
    0
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const isRow = layout === "row"

  return (
    <Card
      className={`h-full border-zinc-700/70 bg-zinc-900/55 ${isDragOver ? "ring-1 ring-zinc-400/70" : ""}`}
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
              <Badge variant="outline" className="border-zinc-800 px-1.5 py-0 text-[10px] text-zinc-300">
                {checkedCount}/{items.length}
              </Badge>
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
          <CardHeader className="px-3 pb-1.5 pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">
                {title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <Badge variant="outline" className="border-zinc-800 px-1.5 py-0 text-[10px] text-zinc-300">
                  {checkedCount}/{items.length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <motion.div layout className="grid gap-1.5">
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
