"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/kb/copy-button";
import { Search } from "lucide-react";
import type { Command } from "@/lib/types";

export function CommandsBrowser({ commands }: { commands: Command[] }) {
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(
    () => Array.from(new Set(commands.flatMap((c) => c.tags ?? []))).sort(),
    [commands]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return commands.filter((c) => {
      const matchesQuery =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.command.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.tags?.some((t) => t.includes(term));
      const matchesTag = !activeTag || c.tags?.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [commands, q, activeTag]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter commands by name, text, or tag…"
          className="pl-9"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {allTags.slice(0, 16).map((t) => (
            <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}>
              <Badge variant={activeTag === t ? "default" : "secondary"}>#{t}</Badge>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map((c) => (
          <Card key={c.id} className="transition-colors hover:border-primary/40">
            <CardContent className="space-y-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/commands/${c.id}`} className="min-w-0">
                  <h3 className="truncate font-medium hover:underline">{c.name}</h3>
                </Link>
                {c.category && <Badge variant="secondary" className="shrink-0">{c.category}</Badge>}
              </div>
              {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              <div className="flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-2">
                <code className="flex-1 truncate font-mono text-xs">{c.command}</code>
                <CopyButton text={c.command} className="h-7 w-7 shrink-0" />
              </div>
              {c.tags && c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.tags.map((t) => (
                    <span key={t} className="text-xs text-primary">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No commands match your filters.
        </p>
      )}
    </div>
  );
}
