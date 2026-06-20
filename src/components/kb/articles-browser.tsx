"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Article } from "@/lib/types";

export function ArticlesBrowser({ articles }: { articles: Article[] }) {
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category).filter(Boolean))) as string[],
    [articles]
  );
  const allTags = useMemo(
    () => Array.from(new Set(articles.flatMap((a) => a.tags ?? []))).sort(),
    [articles]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return articles.filter((a) => {
      const matchesQuery =
        !term ||
        a.title.toLowerCase().includes(term) ||
        a.description?.toLowerCase().includes(term) ||
        a.tags?.some((t) => t.includes(term));
      const matchesTag = !activeTag || a.tags?.includes(activeTag);
      const matchesCategory = !activeCategory || a.category === activeCategory;
      return matchesQuery && matchesTag && matchesCategory;
    });
  }, [articles, q, activeTag, activeCategory]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter articles by title, description, or tag…"
          className="pl-9"
        />
      </div>

      {(categories.length > 0 || allTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCategory(activeCategory === c ? null : c)}>
              <Badge variant={activeCategory === c ? "default" : "outline"}>{c}</Badge>
            </button>
          ))}
          {allTags.slice(0, 14).map((t) => (
            <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}>
              <Badge variant={activeTag === t ? "default" : "secondary"}>#{t}</Badge>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <Link key={a.id} href={`/articles/${a.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium leading-snug">{a.title}</h3>
                  {a.category && <Badge variant="secondary" className="shrink-0">{a.category}</Badge>}
                </div>
                {a.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                  {a.tags?.slice(0, 4).map((t) => (
                    <span key={t} className="text-xs text-primary">
                      #{t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(a.updated_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No articles match your filters.
        </p>
      )}
    </div>
  );
}
