"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommandForm } from "@/components/kb/command-form";
import { FavoriteButton } from "@/components/kb/favorite-button";
import { CopyButton } from "@/components/kb/copy-button";
import { Pencil, Trash2, Eye, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Command } from "@/lib/types";

export function CommandDetail({ command }: { command: Command }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${command.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/commands/${command.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/commands");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Edit Command</h1>
        <CommandForm initial={command} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold leading-tight">{command.name}</h1>
          <div className="flex shrink-0 gap-2">
            <FavoriteButton itemType="command" itemId={command.id} />
            <Button variant="outline" size="icon" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete} disabled={deleting} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {command.description && <p className="text-muted-foreground">{command.description}</p>}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {command.category && <Badge variant="secondary">{command.category}</Badge>}
          {command.tags?.map((t) => (
            <span key={t} className="text-primary">
              #{t}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {command.view_count} views
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Created {format(new Date(command.created_at), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Command</p>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-4">
          <code className="flex-1 whitespace-pre-wrap break-all font-mono text-sm">{command.command}</code>
          <CopyButton text={command.command} />
        </div>
      </div>

      {command.example_output && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Example Output</p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-[#0d1117] p-4 font-mono text-sm">
            {command.example_output}
          </pre>
        </div>
      )}
    </div>
  );
}
