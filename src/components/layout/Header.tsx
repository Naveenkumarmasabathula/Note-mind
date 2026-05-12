"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Search } from "lucide-react";
import BlurText from "@/components/BlurText";
import ShinyText from "@/components/ShinyText";
import { CountingNumber } from "@/components/animate-ui/primitives/texts/counting-number";
import { TimerWidgets } from "@/components/layout/TimerWidgets";
import { useNotePanel } from "@/context/NotePanelContext";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

type HeaderProps = {
  totalNotes: number;
  subjectsCount: number;
  onOpenSidebar?: () => void;
};

type SearchResult = {
  id: string;
  title: string;
  summary: string;
  subject_id: string | null;
  difficulty: Note["difficulty"];
  subjects: { id: string; name: string; color: string } | null;
};

export function Header({ totalNotes, subjectsCount, onOpenSidebar }: HeaderProps) {
  const supabase = createClient();
  const { openNoteById } = useNotePanel();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
      if (isShortcut) {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!searchOpen || !query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setIsSearching(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setIsSearching(false);
        return;
      }

      const searchQuery = sanitizePostgrestLike(query.trim());
      const { data } = await supabase
        .from("notes")
        .select("id,title,summary,subject_id,difficulty,subjects(id,name,color),tags(id,label)")
        .eq("user_id", auth.user.id)
        .or(
          `title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%,tags.label.ilike.%${searchQuery}%`,
        )
        .limit(10);

      const normalized = (data ?? []).map((item) => ({
        ...item,
        subjects: Array.isArray(item.subjects) ? item.subjects[0] ?? null : item.subjects,
      })) as SearchResult[];
      setResults(normalized);
      setIsSearching(false);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [query, searchOpen, supabase]);

  const hasResults = useMemo(() => results.length > 0, [results]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#2e2e2e] bg-[#0f0f0f]/85 px-5 py-4 backdrop-blur xl:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="grid size-10 place-items-center rounded-md border border-[#2e2e2e] bg-[#111111] text-neutral-300 transition hover:border-indigo-500 hover:text-white lg:hidden"
              onClick={onOpenSidebar}
              title="Open sidebar"
              type="button"
            >
              <Menu className="size-5" />
            </button>
            <ShinyText
              text="NoteMind"
              className="text-3xl font-semibold"
              color="#f0f0f0"
              shineColor="#6366f1"
              speed={3}
            />
            <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200">
              AI study notes
            </span>
            <div className="relative w-full max-w-md">
              <div className="flex items-center gap-2 rounded-full border border-[#2e2e2e] bg-[#111111] px-3 py-2 text-sm text-neutral-300 transition focus-within:border-indigo-500">
                <Search className="size-4 text-neutral-500" />
                <input
                  ref={inputRef}
                  className="w-full bg-transparent text-sm text-white outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search notes..."
                  value={query}
                />
              </div>
              {searchOpen ? (
                <div className="absolute left-0 right-0 mt-2 rounded-lg border border-[#2e2e2e] bg-[#111111] p-2 shadow-xl">
                  {!query.trim() ? (
                    <p className="px-2 py-3 text-sm text-neutral-500">Start typing to search notes.</p>
                  ) : null}
                  {isSearching ? (
                    <p className="px-2 py-3 text-sm text-neutral-400">Searching...</p>
                  ) : null}
                  {!isSearching && query.trim() && !hasResults ? (
                    <p className="px-2 py-3 text-sm text-neutral-500">No results yet.</p>
                  ) : null}
                  <div className="space-y-1">
                    {results.map((note) => (
                      <button
                        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm text-neutral-200 transition hover:bg-white/5"
                        key={note.id}
                        onClick={() => {
                          openNoteById(note.id);
                          setSearchOpen(false);
                        }}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{note.title}</p>
                          <p className="truncate text-xs text-neutral-400">{note.subjects?.name ?? "Unsorted"}</p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                            note.difficulty === "easy"
                              ? "bg-[#22c55e] text-[#0b3d1b]"
                              : note.difficulty === "medium"
                                ? "bg-[#f59e0b] text-[#5a3a00]"
                                : "bg-[#ef4444] text-[#4c0b0b]",
                          )}
                        >
                          {note.difficulty}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <BlurText
            text="Turn conversations and manual notes into organized study cards."
            className="text-sm text-neutral-400"
            delay={25}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TimerWidgets />
          <Stat label="Notes" value={totalNotes} />
          <Stat label="Subjects" value={subjectsCount} />
        </div>
      </div>
    </header>
  );
}

/**
 * Remove PostgREST filter-special characters from a search token.
 * Characters `%`, `_`, `,`, `(`, and `)` have meaning in PostgREST
 * query strings and must not be passed through verbatim from user input.
 */
function sanitizePostgrestLike(value: string) {
  return value.replace(/[%_,()]/g, "");
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-md border border-[#2e2e2e] bg-[#1a1a2e] px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-white">
        <CountingNumber number={value} />
      </p>
    </div>
  );
}
