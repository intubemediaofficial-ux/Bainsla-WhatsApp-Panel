import { NextRequest } from "next/server";
import { handle, json, requireWs, HttpError } from "@/lib/api";
import { saveFile } from "@/lib/storage";
import { prisma } from "@/lib/db";

export const POST = handle(async (req: NextRequest) => {
  const s = await requireWs();
  const fd = await req.formData();
  const f = fd.get("file");
  if (!(f instanceof File)) throw new HttpError(400, "file required");
  if (f.size > 64 * 1024 * 1024) throw new HttpError(400, "Max 64 MB");
  const buf = Buffer.from(await f.arrayBuffer());
  const saved = await saveFile(s.wid, buf, f.type || "application/octet-stream", f.name);
  const asset = await prisma.mediaAsset.create({ data: { workspaceId: s.wid, name: f.name, url: saved.url, mime: f.type, size: f.size } });
  return json({ ...saved, id: asset.id, mime: f.type, name: f.name });
});
