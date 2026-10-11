/* eslint-disable @typescript-eslint/no-explicit-any */
export function pick(b: any) {
  const keys = ["name", "triggers", "nodes", "edges", "active"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o: any = {};
  for (const k of keys) if (b[k] !== undefined) o[k] = b[k];
  return o;
}
