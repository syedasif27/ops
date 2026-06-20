"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, Trash2, Copy, Check } from "lucide-react";
import type { Attachment } from "@/lib/types";

export function AttachmentUploader({
  articleId,
  onInsert,
}: {
  articleId: string;
  onInsert: (markdown: string) => void;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    return fetch(`/api/uploads?articleId=${articleId}`)
      .then((res) => res.json())
      .then((data) => {
        setAttachments(data.attachments ?? []);
        setLoading(false);
      });
  }, [articleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("articleId", articleId);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Failed to upload ${file.name}`);
        continue;
      }
      const data = await res.json();
      const a: Attachment = data.attachment;
      onInsert(`![${a.filename}](/api/uploads/${a.id})`);
    }
    setUploading(false);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this attachment? Any markdown references to it will break.")) return;
    const res = await fetch(`/api/uploads/${id}`, { method: "DELETE" });
    if (res.ok) refresh();
  }

  function copyMarkdown(a: Attachment) {
    navigator.clipboard.writeText(`![${a.filename}](/api/uploads/${a.id})`);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">
          {uploading ? "Uploading…" : "Drop an image here, or click to upload (PNG/JPEG/GIF/WebP/SVG, max 10MB)"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-1.5 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${a.id}`}
                  alt={a.filename}
                  className="h-20 w-full rounded object-cover"
                />
                <p className="truncate text-xs text-muted-foreground" title={a.filename}>
                  {a.filename}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 flex-1 px-2 text-xs" onClick={() => copyMarkdown(a)}>
                    {copiedId === a.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs hover:text-destructive"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
