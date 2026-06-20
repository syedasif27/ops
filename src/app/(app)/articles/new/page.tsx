import { ArticleForm } from "@/components/kb/article-form";

export default function NewArticlePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Article</h1>
        <p className="text-sm text-muted-foreground">
          Write it once, find it instantly next time.
        </p>
      </div>
      <ArticleForm />
    </div>
  );
}
