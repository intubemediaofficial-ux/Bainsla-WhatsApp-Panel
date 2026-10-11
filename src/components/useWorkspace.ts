"use client";
import { useCallback, useEffect, useState } from "react";
import { api, toast } from "./ui";

export type Ws = { id: string; name: string; brandName?: string; logoUrl?: string; primaryColor?: string; webhookUrl?: string; webhookSecret?: string; aiEnabled: boolean; aiProvider: string; aiModel?: string; aiApiKey?: string; aiPrompt?: string; settings: Record<string, unknown>; role: string; plan?: { name: string } | null; planExpiresAt?: string; wallet: string };

export function useWorkspace() {
  const [ws, setWs] = useState<Ws | null>(null);
  const load = useCallback(() => api<Ws>("/api/workspace").then(setWs), []);
  useEffect(() => { load(); }, [load]);
  const save = async (d: Partial<Ws> & { settings?: Record<string, unknown> }) => {
    try { await api("/api/workspace", { method: "PATCH", json: d }); toast("Saved"); load(); } catch (e) { toast((e as Error).message, "err"); }
  };
  return { ws, setWs, save, load };
}
