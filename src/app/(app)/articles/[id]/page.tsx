export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getArticle, incrementArticleView } from "@/lib/db";
import { ArticleDetail } from "@/components/kb/article-detail";

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();

  incrementArticleView(id); // fire and forget

  return <ArticleDetail article={article} />;
}
