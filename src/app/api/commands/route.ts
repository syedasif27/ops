import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listCommands, createCommand } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;

  try {
    const commands = await listCommands({ category, tag });
    return NextResponse.json({ commands });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load commands" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.command) {
    return NextResponse.json({ error: "name and command are required" }, { status: 400 });
  }

  try {
    const command = await createCommand({
      name: body.name,
      description: body.description,
      category: body.category,
      command: body.command,
      example_output: body.example_output,
      tags: body.tags ?? [],
    });
    return NextResponse.json({ command }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create command" }, { status: 500 });
  }
}
