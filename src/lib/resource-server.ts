import { randomBytes } from "crypto";
import { prisma } from "./db";
import { HttpError } from "./api";
import { Field, RESOURCES, ResourceDef } from "./resources";
import { normalizePhone } from "./phone";

export function getDef(res: string): ResourceDef {
  const d = RESOURCES[res];
  if (!d) throw new HttpError(404, "Unknown resource");
  return d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const delegate = (d: ResourceDef) => (prisma as any)[d.model];

function coerce(f: Field, v: unknown) {
  if (v === undefined) return undefined;
  switch (f.type) {
    case "number":
      return v === "" || v === null ? (f.required ? 0 : null) : Number(v);
    case "boolean":
      return v === true || v === "true" || v === "on";
    case "tags":
      return Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : String(v || "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    case "date":
    case "datetime":
      return v ? new Date(String(v)) : null;
    case "json":
      if (typeof v === "string") {
        try {
          return v.trim() ? JSON.parse(v) : {};
        } catch {
          throw new HttpError(400, `${f.label}: invalid JSON`);
        }
      }
      return v;
    case "phone":
      return v ? normalizePhone(String(v)) : null;
    default:
      return v === null ? null : String(v);
  }
}

export function cleanInput(d: ResourceDef, input: Record<string, unknown>, creating: boolean) {
  const out: Record<string, unknown> = {};
  for (const f of d.fields) {
    if (f.form === false) continue;
    const val = coerce(f, input[f.name]);
    if (val === undefined) continue;
    if (f.type === "select" && val === "") {
      out[f.name] = null;
      continue;
    }
    out[f.name] = val;
  }
  if (creating)
    for (const f of d.fields)
      if (f.required && (out[f.name] === undefined || out[f.name] === "" || out[f.name] === null)) throw new HttpError(400, `${f.label} is required`);
  return out;
}

const slug = () => randomBytes(4).toString("hex");

export async function beforeCreate(res: string, data: Record<string, unknown>, wid: string | null) {
  if (res === "forms" || res === "tracked-links") data.slug = slug();
  if (res === "orders") data.number = `ORD-${Date.now().toString().slice(-7)}`;
  if (res === "support" && wid) {
    const ws = await prisma.workspace.findUnique({ where: { id: wid } });
    data.userName = ws?.name;
  }
  if (res === "admin-coupons" && data.code) data.code = String(data.code).toUpperCase();
  return data;
}
