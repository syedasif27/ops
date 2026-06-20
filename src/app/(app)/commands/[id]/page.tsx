export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCommand, incrementCommandView } from "@/lib/db";
import { CommandDetail } from "@/components/kb/command-detail";

export default async function CommandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const command = await getCommand(id);
  if (!command) notFound();

  incrementCommandView(id); // fire and forget

  return <CommandDetail command={command} />;
}
