import { MarkdownImport } from "@/components/kb/markdown-import";

export default function ImportArticlesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Markdown</h1>
        <p className="text-sm text-muted-foreground">
          Bring in existing documentation — bulk upload .md files and they&rsquo;ll
          become articles in your knowledge base.
        </p>
      </div>
      <MarkdownImport />
    </div>
  );
}
