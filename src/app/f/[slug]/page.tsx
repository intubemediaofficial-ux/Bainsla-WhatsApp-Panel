import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PublicForm from "./PublicForm";

export const dynamic = "force-dynamic";

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await prisma.form.findUnique({ where: { slug } });
  if (!f || !f.active) notFound();
  const ws = await prisma.workspace.findUnique({ where: { id: f.workspaceId } });
  return <PublicForm slug={slug} name={f.name} description={f.description} fields={(f.fields as string[]) || []} brand={ws?.brandName || ws?.name || ""} logo={ws?.logoUrl} />;
}
