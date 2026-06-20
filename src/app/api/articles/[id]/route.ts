import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getArticle, updateArticle, deleteArticle, incrementArticleView } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const article = await getArticle(id);
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await incrementArticleView(id);
    return NextResponse.json({ article });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load article" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  try {
    const article = await updateArticle(id, body);
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ article });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteArticle(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}
