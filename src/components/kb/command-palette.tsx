"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, FileText, Terminal as TerminalIcon, Loader2 } from "lucide-react";
import type { SearchResult } from "@/lib/types";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  function handleOpenChange(v: boolean) {
    if (!v) {
      setQuery("");
      setResults([]);
    }
    onOpenChange(v);
  }

  function go(result: SearchResult) {
    onOpenChange(false);
    router.push(result.type === "article" ? `/articles/${result.id}` : `/commands/${result.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideClose className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, commands, tags…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && query && !loading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
          {results.length === 0 && !query && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Try “openvpn internet issue” or “bgp neighbor”
            </p>
          )}
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => go(r)}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-secondary"
            >
              {r.type === "article" ? (
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <TerminalIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.snippet}</span>
              </span>
              {r.category && (
                <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                  {r.category}
                </span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
