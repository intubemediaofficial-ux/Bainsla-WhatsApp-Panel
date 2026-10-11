import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR || "./uploads");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/amr": "amr",
  "application/pdf": "pdf", "text/plain": "txt", "text/csv": "csv",
};

export function publicFileUrl(rel: string) {
  return `${(process.env.APP_URL || "").replace(/\/$/, "")}/api/files/${rel}`;
}

export async function saveFile(workspaceId: string, buf: Buffer, mime: string, name?: string) {
  const dir = path.join(uploadRoot(), workspaceId);
  await mkdir(dir, { recursive: true });
  const safe = (name || "file").replace(/[^\w.-]+/g, "_").slice(-60);
  const ext = EXT[mime.split(";")[0]] || safe.split(".").pop() || "bin";
  const base = safe.includes(".") ? safe.replace(/\.[^.]+$/, "") : safe;
  const file = `${Date.now()}-${randomBytes(4).toString("hex")}-${base}.${ext}`;
  await writeFile(path.join(dir, file), buf);
  const rel = `${workspaceId}/${file}`;
  return { rel, url: `/api/files/${rel}`, absUrl: publicFileUrl(rel) };
}
