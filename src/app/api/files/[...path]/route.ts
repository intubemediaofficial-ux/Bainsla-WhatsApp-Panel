import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { uploadRoot } from "@/lib/storage";

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", ogg: "audio/ogg", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", amr: "audio/amr", pdf: "application/pdf", txt: "text/plain", csv: "text/csv" };

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const root = uploadRoot();
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  try {
    await stat(file);
    const buf = await readFile(file);
    const ext = file.split(".").pop()?.toLowerCase() || "";
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
