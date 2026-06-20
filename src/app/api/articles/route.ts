import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listArticles, createArticle } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;

  try {
    const articles = await listArticles({ category, tag });
    return NextResponse.json({ articles });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load articles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const article = await createArticle({
      title: body.title,
      description: body.description,
      category: body.category,
      content: body.content ?? "",
      tags: body.tags ?? [],
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
