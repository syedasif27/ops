"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Terminal,
  ClipboardList,
  Server,
  ShieldCheck,
  Lock,
  Tag,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/articles", label: "Articles", icon: FileText },
  { href: "/commands", label: "Commands", icon: Terminal },
];

const comingSoon = [
  { label: "Runbooks", icon: ClipboardList },
  { label: "Infrastructure", icon: Server },
  { label: "VPN Inventory", icon: ShieldCheck },
  { label: "SSL Tracker", icon: Lock },
  { label: "Tags", icon: Tag },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
          <Terminal className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold">AsifOps KB</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          Coming soon
        </p>
        {comingSoon.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground/50"
              title="Planned for a future pass"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono">⌘K</kbd>{" "}
        search ·{" "}
        <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono">N</kbd>{" "}
        new article
      </div>
    </aside>
  );
}
