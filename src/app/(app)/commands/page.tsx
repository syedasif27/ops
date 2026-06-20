export const dynamic = "force-dynamic";

import { listCommands } from "@/lib/db";
import { CommandsBrowser } from "@/components/kb/commands-browser";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function CommandsPage() {
  const commands = await listCommands();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Command Library</h1>
          <p className="text-sm text-muted-foreground">
            Reusable shell commands with copy-to-clipboard.
          </p>
        </div>
        <Button asChild>
          <Link href="/commands/new">
            <Plus className="h-4 w-4" />
            New Command
          </Link>
        </Button>
      </div>

      <CommandsBrowser commands={commands} />
    </div>
  );
}
