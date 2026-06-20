"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TagInput } from "@/components/kb/tag-input";
import { Markdown } from "@/components/kb/markdown";
import { Card } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import type { Article } from "@/lib/types";

const CATEGORY_SUGGESTIONS = [
  "Nextcloud", "OpenVPN", "IPsec", "strongSwan", "FRR", "BGP", "Docker",
  "Kubernetes", "Monitoring", "BackupPC", "MariaDB", "LDAP", "SUSE MLM", "GCP", "AWS",
];

export function ArticleForm({ initial }: { initial?: Article }) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { title, description, category, content, tags };
      const res = await fetch(isEdit ? `/api/articles/${initial!.id}` : "/api/articles", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      router.push(`/articles/${data.article.id}`);
      router.refresh();
    } catch {
      setError("Couldn't save the article. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Nextcloud + Redis locking fix" />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Nextcloud"
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <TagInput value={tags} onChange={setTags} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two sentences describing what this article covers."
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Content (Markdown)</Label>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"## Symptom\n\n## Diagnosis\n```bash\nsysctl net.ipv4.ip_forward\n```\n\n## Resolution"}
              rows={18}
              className="font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="preview">
            <Card className="min-h-[420px] p-5">
              {content.trim() ? (
                <Markdown content={content} />
              ) : (
                <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Create Article"}
        </Button>
      </div>
    </div>
  );
}
