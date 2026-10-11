export function normalizePhone(raw: string, defaultCc = "91"): string {
  let d = String(raw || "").replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = defaultCc + d;
  return d;
}

export const isValidPhone = (p: string) => /^\d{10,15}$/.test(p);
