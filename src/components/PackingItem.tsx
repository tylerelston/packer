import { Trash2 } from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { PackingItem as PackingItemType } from "@/types/schema"

type PackingItemProps = {
  item: PackingItemType
  onToggle: (id: string) => void
  onDelete?: (id: string) => void
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
}

export function PackingItem({
  item,
  onToggle,
  onDelete,
  onDragStart,
  onDragEnd,
}: PackingItemProps) {
  const handleToggle = () => onToggle(item.id)

  return (
    <motion.div
      layout
      layoutId={item.id}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
    >
      <Card
        className={cn(
          "group cursor-grab border border-zinc-800/70 bg-zinc-900/50 transition-colors hover:border-zinc-600 active:cursor-grabbing",
          item.checked && "border-primary-green/30 bg-primary-green/5 opacity-80"
        )}
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleToggle()
          }
        }}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id)
          event.dataTransfer.effectAllowed = "move"
          onDragStart?.(item.id)
        }}
        onDragEnd={() => onDragEnd?.()}
      >
        <CardContent className="flex h-8 items-center gap-1.5 px-1.5 py-1">
          <Checkbox
            checked={item.checked}
            onCheckedChange={handleToggle}
            onClick={(event) => event.stopPropagation()}
          />
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-[11px] font-medium text-zinc-100 transition-colors",
                item.checked && "text-primary-green"
              )}
            >
              {item.name}
            </div>
          </div>
          <button
            type="button"
            aria-label="Delete item"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 opacity-0 transition hover:text-zinc-200 group-hover:opacity-100 group-focus-within:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
              onDelete?.(item.id)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
