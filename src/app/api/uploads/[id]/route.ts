import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttachment, deleteAttachmentRecord } from "@/lib/db";
import { getSignedReadUrl, deleteFromGcs } from "@/lib/gcs";

type Params = { params: Promise<{ id: string }> };

// Used as the <img src> / markdown link target. Embedding this stable URL
// (rather than a signed URL directly) means the link in saved markdown
// never expires — each request mints a fresh short-lived signed URL and
// redirects to it.
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const attachment = await getAttachment(id);
    if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = await getSignedReadUrl(attachment.gcs_path);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load attachment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const attachment = await getAttachment(id);
    if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFromGcs(attachment.gcs_path);
    await deleteAttachmentRecord(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}
