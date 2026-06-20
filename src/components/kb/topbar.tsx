"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Upload, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function Topbar({ onSearchClick }: { onSearchClick: () => void }) {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <button
        onClick={onSearchClick}
        className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-md border border-input bg-secondary/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Search className="h-4 w-4" />
        Search knowledge base…
        <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-xs">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href="/articles/import">
            <Upload className="h-4 w-4" />
            Import
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/articles/new">
            <Plus className="h-4 w-4" />
            New Article
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/commands/new">
            <Plus className="h-4 w-4" />
            New Command
          </Link>
        </Button>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border outline-none">
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={32} height={32} className="h-8 w-8 object-cover" />
              ) : (
                <span className="text-xs font-medium">{session.user.name?.[0] ?? "U"}</span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{session.user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{session.user.githubUsername}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
