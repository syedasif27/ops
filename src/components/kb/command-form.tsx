"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/kb/tag-input";
import { Loader2, Save } from "lucide-react";
import type { Command } from "@/lib/types";

export function CommandForm({ initial }: { initial?: Command }) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [command, setCommand] = useState(initial?.command ?? "");
  const [exampleOutput, setExampleOutput] = useState(initial?.example_output ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !command.trim()) {
      setError("Name and command are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { name, description, category, command, example_output: exampleOutput, tags };
      const res = await fetch(isEdit ? `/api/commands/${initial!.id}` : "/api/commands", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      router.push(`/commands/${data.command.id}`);
      router.refresh();
    } catch {
      setError("Couldn't save the command. Please try again.");
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
        <div className="space-y-1.5">
          <Label>Command Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Check IP forwarding" />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Networking" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this command does and when to use it."
            rows={2}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Command</Label>
          <Textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="iptables -t nat -L -n -v"
            rows={3}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Example Output</Label>
          <Textarea
            value={exampleOutput}
            onChange={(e) => setExampleOutput(e.target.value)}
            placeholder="Paste sample output here…"
            rows={4}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Tags</Label>
          <TagInput value={tags} onChange={setTags} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Create Command"}
        </Button>
      </div>
    </div>
  );
}
