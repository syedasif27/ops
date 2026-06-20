export const dynamic = "force-dynamic";

import { listArticles } from "@/lib/db";
import { ArticlesBrowser } from "@/components/kb/articles-browser";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";

export default async function ArticlesPage() {
  const articles = await listArticles();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="text-sm text-muted-foreground">
            Knowledge articles, infra notes, and how-tos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/articles/import">
              <Upload className="h-4 w-4" />
              Import Markdown
            </Link>
          </Button>
          <Button asChild>
            <Link href="/articles/new">
              <Plus className="h-4 w-4" />
              New Article
            </Link>
          </Button>
        </div>
      </div>

      <ArticlesBrowser articles={articles} />
    </div>
  );
}
