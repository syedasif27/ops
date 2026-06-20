import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCommand, updateCommand, deleteCommand, incrementCommandView } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const command = await getCommand(id);
    if (!command) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await incrementCommandView(id);
    return NextResponse.json({ command });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load command" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  try {
    const command = await updateCommand(id, body);
    if (!command) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ command });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update command" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteCommand(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete command" }, { status: 500 });
  }
}
