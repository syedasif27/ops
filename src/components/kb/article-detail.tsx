"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/kb/markdown";
import { ArticleForm } from "@/components/kb/article-form";
import { FavoriteButton } from "@/components/kb/favorite-button";
import { Pencil, Trash2, Eye, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Article } from "@/lib/types";

export function ArticleDetail({ article }: { article: Article }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${article.title}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/articles");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Edit Article</h1>
        <ArticleForm initial={article} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold leading-tight">{article.title}</h1>
          <div className="flex shrink-0 gap-2">
            <FavoriteButton itemType="article" itemId={article.id} />
            <Button variant="outline" size="icon" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete} disabled={deleting} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {article.description && <p className="text-muted-foreground">{article.description}</p>}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {article.category && <Badge variant="secondary">{article.category}</Badge>}
          {article.tags?.map((t) => (
            <span key={t} className="text-primary">
              #{t}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {article.view_count} views
          </span>
          <span>Created {format(new Date(article.created_at), "MMM d, yyyy")}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <Markdown content={article.content} />
      </div>
    </div>
  );
}
