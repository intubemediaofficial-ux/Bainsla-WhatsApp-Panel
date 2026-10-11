import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { audit, handle, HttpError, json, requireWs } from "@/lib/api";

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const fd = await req.formData();
  const f = fd.get("file");
  if (!(f instanceof File)) throw new HttpError(400, "File required");
  if (f.size > 10 * 1024 * 1024) throw new HttpError(400, "Max 10 MB");
  let text = "";
  if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
    const { extractText } = await import("unpdf");
    const r = await extractText(new Uint8Array(await f.arrayBuffer()), { mergePages: true });
    text = Array.isArray(r.text) ? r.text.join("\n") : r.text;
  } else text = await f.text();
  text = text.replace(/\u0000/g, "").trim();
  if (!text) throw new HttpError(400, "Could not read any text from this file");
  const doc = await prisma.knowledgeDoc.create({ data: { workspaceId: s.wid, title: String(fd.get("title") || f.name), fileName: f.name, content: text.slice(0, 500000) } });
  await audit(s.wid, s.name, "kb.upload", f.name);
  return json({ id: doc.id, chars: text.length });
});
