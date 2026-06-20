"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseMarkdownFile } from "@/lib/markdown-import";
import { UploadCloud, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface StagedFile {
  filename: string;
  raw: string;
  title: string;
  category: string;
  tags: string[];
  description: string | null;
}

type ImportResult = { filename: string; ok: boolean; articleId?: string; error?: string };

export function MarkdownImport() {
  const router = useRouter();
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const mdFiles = Array.from(fileList).filter((f) => /\.mdx?$/i.test(f.name));
    const parsed = await Promise.all(
      mdFiles.map(async (f) => {
        const raw = await f.text();
        const p = parseMarkdownFile(f.name, raw);
        return {
          filename: f.name,
          raw,
          title: p.title,
          category: p.category ?? "",
          tags: p.tags,
          description: p.description,
        } satisfies StagedFile;
      })
    );
    setStaged((prev) => [...prev, ...parsed]);
    setResults(null);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeStaged(filename: string) {
    setStaged((prev) => prev.filter((f) => f.filename !== filename));
  }

  function updateStaged(filename: string, patch: Partial<StagedFile>) {
    setStaged((prev) => prev.map((f) => (f.filename === filename ? { ...f, ...patch } : f)));
  }

  async function handleImport() {
    if (staged.length === 0) return;
    setImporting(true);
    setResults(null);
    try {
      const res = await fetch("/api/articles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: staged.map((f) => ({
            filename: f.filename,
            content: f.raw,
            title: f.title,
            category: f.category,
          })),
        }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      const succeeded = (data.results ?? []).filter((r: ImportResult) => r.ok).map((r: ImportResult) => r.filename);
      setStaged((prev) => prev.filter((f) => !succeeded.includes(f.filename)));
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drop .md or .mdx files here, or click to browse</p>
        <p className="text-xs text-muted-foreground">
          Optional YAML frontmatter (title, description, category, tags) is parsed automatically.
          Otherwise the title comes from the first heading or the filename.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.mdx,text/markdown"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {results && (
        <div className="space-y-1.5">
          {results.map((r) => (
            <div
              key={r.filename}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                r.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              {r.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span className="truncate">{r.filename}</span>
              <span className="ml-auto text-xs opacity-80">{r.ok ? "Imported" : r.error}</span>
            </div>
          ))}
        </div>
      )}

      {staged.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {staged.length} file{staged.length > 1 ? "s" : ""} ready to import — review titles/categories below.
          </p>
          {staged.map((f) => (
            <Card key={f.filename}>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs text-muted-foreground">{f.filename}</span>
                  <button
                    onClick={() => removeStaged(f.filename)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={f.title}
                    onChange={(e) => updateStaged(f.filename, { title: e.target.value })}
                    placeholder="Title"
                  />
                  <Input
                    value={f.category}
                    onChange={(e) => updateStaged(f.filename, { category: e.target.value })}
                    placeholder="Category (optional)"
                  />
                </div>
                {f.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {f.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Import {staged.length} article{staged.length > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
