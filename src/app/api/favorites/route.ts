import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleFavorite, listFavoriteIds } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemType = (searchParams.get("itemType") as "article" | "command") ?? "article";

  try {
    const ids = await listFavoriteIds(itemType);
    return NextResponse.json({ ids });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { itemType, itemId } = body as { itemType: "article" | "command"; itemId: string };
  if (!itemType || !itemId) {
    return NextResponse.json({ error: "itemType and itemId are required" }, { status: 400 });
  }

  try {
    const result = await toggleFavorite(itemType, itemId, null);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
  }
}
