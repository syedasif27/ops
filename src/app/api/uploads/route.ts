import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { createAttachment, listAttachmentsForArticle } from "@/lib/db";
import { uploadToGcs, isGcsConfigured } from "@/lib/gcs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get("articleId");
  if (!articleId) return NextResponse.json({ error: "articleId is required" }, { status: 400 });

  try {
    const attachments = await listAttachmentsForArticle(articleId);
    return NextResponse.json({ attachments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to list attachments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isGcsConfigured()) {
    return NextResponse.json(
      { error: "GCS_BUCKET_NAME / GCS_SERVICE_ACCOUNT_KEY are not configured on the server." },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const articleId = formData.get("articleId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof articleId !== "string" || !articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 10MB limit" }, { status: 413 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}` }, { status: 415 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `articles/${articleId}/${randomUUID()}-${safeName}`;

    await uploadToGcs({ objectPath, buffer, contentType: file.type });

    const attachment = await createAttachment({
      articleId,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      gcsPath: objectPath,
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
