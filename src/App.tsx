import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CategorySection } from "@/components/CategorySection";
import { usePackingState } from "@/hooks/usePackingState";
import { DEFAULT_CATEGORY } from "@/types/schema";

const SUGGESTED_CATEGORIES = [
  "Clothing",
  "Toiletries",
  "Tech",
  "Documents",
  "Misc",
];

export function App() {
  const {
    categories,
    categoryList,
    stats,
    addItems,
    toggleItem,
    deleteItem,
    moveItemToCategory,
    resetItems,
    share,
  } = usePackingState();
  const [draft, setDraft] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHint, setActiveHint] = useState(0);
  const [categoryQuery, setCategoryQuery] = useState<{
    query: string;
    start: number;
    end: number;
  } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hints = useMemo(
    () => [
      "Add items (press Enter)",
      "Socks, Shirt, Pants #Clothing",
      "#Toiletries Toothbrush, Toothpaste",
      "Passport, Boarding Pass #Documents",
      "Camera, Charger #Tech",
      "Sunscreen, Sunglasses #Misc",
      "Paste a list from your notes",
    ],
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHint((current) => (current + 1) % hints.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [hints.length]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const next = Math.min(textarea.scrollHeight, 96);
    textarea.style.height = `${next}px`;
  }, [draft]);

  const handleAdd = () => {
    const added = addItems(draft);
    if (added > 0) {
      setDraft("");
      setCategoryQuery(null);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData("text");
    if (text.includes("\n")) {
      event.preventDefault();
      addItems(text);
      setDraft("");
      setCategoryQuery(null);
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const result = await share();
    setShareNote(result.copied ? "Link copied." : "Share URL ready.");
    window.setTimeout(() => setShareNote(""), 2400);
    setSharing(false);
  };

  const categorySuggestions = useMemo(() => {
    const merged = [...categoryList, ...SUGGESTED_CATEGORIES].filter(
      (category) => category !== DEFAULT_CATEGORY,
    );
    const seen = new Set<string>();
    return merged.filter((category) => {
      if (seen.has(category)) return false;
      seen.add(category);
      return true;
    });
  }, [categoryList]);

  const updateCategoryQuery = (value: string, caret: number | null) => {
    if (caret === null) {
      setCategoryQuery(null);
      return;
    }
    const left = value.slice(0, caret);
    const match = /(?:^|\s)#([^\s#]*)$/.exec(left);
    if (!match) {
      setCategoryQuery(null);
      return;
    }
    const start = left.lastIndexOf("#");
    setCategoryQuery({
      query: match[1] ?? "",
      start,
      end: caret,
    });
  };

  const filteredSuggestions = useMemo(() => {
    if (!categoryQuery) return [];
    const query = categoryQuery.query.toLowerCase();
    return categorySuggestions
      .filter((category) => category.toLowerCase().startsWith(query))
      .slice(0, 6);
  }, [categoryQuery, categorySuggestions]);

  const applySuggestion = (category: string) => {
    if (!categoryQuery) return;
    const before = draft.slice(0, categoryQuery.start);
    const after = draft.slice(categoryQuery.end);
    const needsSpace = after.length === 0 || !after.startsWith(" ");
    const nextValue = `${before}#${category}${needsSpace ? " " : ""}${after}`;
    setDraft(nextValue);
    setCategoryQuery(null);
    window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const position = (before + `#${category}` + (needsSpace ? " " : ""))
        .length;
      input.setSelectionRange(position, position);
      input.focus();
    });
  };

  const uncategorized = categories.find(
    (group) => group.category === DEFAULT_CATEGORY,
  );
  const categorized = categories.filter(
    (group) => group.category !== DEFAULT_CATEGORY,
  );
  const hasAnyItems = categories.some((group) => group.items.length > 0);
  const showUncategorizedStrip =
    isDragging && (!uncategorized || uncategorized.items.length === 0);

  return (
    <div className="dark min-h-screen bg-zinc-900 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6 pb-28">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">
                Travel Kit
              </p>
              <h1 className="text-2xl font-semibold text-zinc-50">Packer</h1>
              <p className="text-xs text-zinc-400">
                Tap anywhere on a card to mark it packed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={resetItems}
                className="border border-zinc-700/60 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleShare} disabled={sharing}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-800/50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{stats.checked} packed</span>
                <span>{stats.total} total</span>
              </div>
              <Progress value={stats.progress} className="h-2" />
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge
                variant="outline"
                className="border-zinc-600 text-zinc-200"
              >
                {stats.checked}/{stats.total} packed
              </Badge>
              {shareNote ? (
                <span className="text-xs text-zinc-400">{shareNote}</span>
              ) : null}
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
            />
          ) : null}
          {showUncategorizedStrip ? (
            <div
              className="flex items-center justify-between rounded-full border border-dashed border-zinc-600/70 bg-zinc-900/50 px-3 py-1 text-[11px] text-zinc-300"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                if (id) moveItemToCategory(id, DEFAULT_CATEGORY);
                setIsDragging(false);
              }}
            >
              <span>Drop here to uncategorize</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {DEFAULT_CATEGORY}
              </span>
            </div>
          ) : null}
          {categorized.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      <div className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/80 p-2 shadow-lg shadow-black/30 backdrop-blur">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={draft}
                rows={1}
                onChange={(event) => {
                  setDraft(event.target.value);
                  updateCategoryQuery(
                    event.target.value,
                    event.target.selectionStart,
                  );
                }}
                onClick={(event) => {
                  const target = event.target as HTMLTextAreaElement;
                  updateCategoryQuery(target.value, target.selectionStart);
                }}
                onSelect={(event) => {
                  const target = event.target as HTMLTextAreaElement;
                  updateCategoryQuery(target.value, target.selectionStart);
                }}
                onBlur={() => setCategoryQuery(null)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (event.key === "Tab" && filteredSuggestions.length) {
                    event.preventDefault();
                    applySuggestion(filteredSuggestions[0]!);
                    return;
                  }
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleAdd();
                  }
                }}
                onKeyUp={(event) => {
                  const target = event.currentTarget;
                  updateCategoryQuery(target.value, target.selectionStart);
                }}
                placeholder=""
                className="no-scrollbar h-9 max-h-24 w-full resize-none rounded-full border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-xs leading-[1.4] text-zinc-100 outline-none placeholder:text-zinc-500"
              />
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
              {categoryQuery && filteredSuggestions.length ? (
                <div className="absolute left-0 top-full z-40 mt-2 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-1 shadow-xl shadow-black/40">
                  {filteredSuggestions.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-zinc-800/70"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySuggestion(category);
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
            <Button
              onClick={handleAdd}
              className="h-9 rounded-full px-4 text-xs"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
