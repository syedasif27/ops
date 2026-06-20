export const dynamic = "force-dynamic";

import { getDashboardStats } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FileText, Terminal, ClipboardList, Clock, Eye, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    { label: "Total Articles", value: stats.totalArticles, icon: FileText, href: "/articles" },
    { label: "Total Runbooks", value: stats.totalRunbooks, icon: ClipboardList, href: "#" },
    { label: "Total Commands", value: stats.totalCommands, icon: Terminal, href: "/commands" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          An overview of your operational knowledge base.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-3xl font-semibold">{s.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Recently Updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pb-2">
            {stats.recentlyUpdated.length === 0 && <EmptyRow text="No articles yet." />}
            {stats.recentlyUpdated.map((a) => (
              <ArticleRow key={a.id} title={a.title} meta={formatDistanceToNow(new Date(a.updated_at), { addSuffix: true })} href={`/articles/${a.id}`} category={a.category} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Most Viewed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pb-2">
            {stats.mostViewed.length === 0 && <EmptyRow text="No views recorded yet." />}
            {stats.mostViewed.map((a) => (
              <ArticleRow key={a.id} title={a.title} meta={`${a.view_count} views`} href={`/articles/${a.id}`} category={a.category} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Star className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Favorites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pb-2">
            {stats.favoriteArticles.length === 0 && (
              <EmptyRow text="Star an article to pin it here." />
            )}
            {stats.favoriteArticles.map((a) => (
              <ArticleRow key={a.id} title={a.title} meta={a.category ?? "Uncategorized"} href={`/articles/${a.id}`} category={a.category} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ArticleRow({
  title,
  meta,
  href,
  category,
}: {
  title: string;
  meta: string;
  href: string;
  category: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-secondary/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      {category && <Badge variant="secondary">{category}</Badge>}
    </Link>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-5 py-4 text-sm text-muted-foreground">{text}</p>;
}
