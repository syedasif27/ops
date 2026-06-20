import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createArticle } from "@/lib/db";
import { parseMarkdownFile } from "@/lib/markdown-import";

interface ImportFile {
  filename: string;
  content: string;
  // Optional overrides the user made in the UI before confirming import
  title?: string;
  category?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const files = body.files as ImportFile[] | undefined;

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > 50) {
    return NextResponse.json({ error: "Import up to 50 files at a time" }, { status: 400 });
  }

  const results: { filename: string; ok: boolean; articleId?: string; error?: string }[] = [];

  for (const file of files) {
    try {
      const parsed = parseMarkdownFile(file.filename, file.content);
      const article = await createArticle({
        title: file.title?.trim() || parsed.title,
        description: parsed.description ?? undefined,
        category: file.category?.trim() || parsed.category || undefined,
        content: parsed.content,
        tags: parsed.tags,
      });
      results.push({ filename: file.filename, ok: true, articleId: article.id });
    } catch (err) {
      console.error(`Import failed for ${file.filename}`, err);
      results.push({ filename: file.filename, ok: false, error: "Failed to save" });
    }
  }

  return NextResponse.json({ results });
}
