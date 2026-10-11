"use client";
import * as I from "lucide-react";
import { PageHero } from "@/components/ui";

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const EPS: [string, string, string, string][] = [
  ["POST", "/api/v1/messages", "Send a text message (within 24h window)", `{ "to": "919876543210", "type": "text", "text": "Hello from API" }`],
  ["POST", "/api/v1/messages", "Send an approved template", `{ "to": "919876543210", "template": "order_update", "language": "en", "variables": { "body": ["Rahul", "#1023"] } }`],
  ["POST", "/api/v1/messages", "Send media", `{ "to": "919876543210", "type": "image", "url": "https://…/photo.jpg", "caption": "New arrivals" }`],
  ["POST", "/api/v1/contacts", "Create / update a contact", `{ "phone": "919876543210", "name": "Rahul", "tags": ["website"], "customFields": { "city": "Jaipur" } }`],
  ["GET", "/api/v1/contacts?page=1", "List contacts (100 per page)", ""],
];

export default function Docs() {
  return (
    <div>
      <PageHero title="API Documentation" subtitle="REST API — authenticate with your API key from API & Webhooks" icon={<I.Code2 />} />
      <div className="card mb-5 p-5 text-sm"><div className="label">Authentication</div><pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-200">{`Authorization: Bearer bwk_xxxxxxxxxxxxxxxx\nContent-Type: application/json`}</pre></div>
      <div className="space-y-4">{EPS.map(([m, p, d, b], i) => (
        <div key={i} className="card p-5"><div className="flex items-center gap-3"><span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${m === "GET" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>{m}</span><code className="font-semibold">{p}</code></div><p className="mt-2 text-sm text-slate-500">{d}</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-200">{`curl -X ${m} ${ORIGIN}${p} \\\n  -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json"${b ? ` \\\n  -d '${b}'` : ""}`}</pre></div>
      ))}</div>
      <div className="card mt-5 p-5 text-sm"><div className="label">Webhook payload (outgoing)</div><pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-200">{`{ "event": "message.received", "contact": { "phone": "919876543210", "name": "Rahul" }, "message": { "type": "text", "body": "Hi" }, "timestamp": "2026-10-11T10:00:00Z" }`}</pre></div>
    </div>
  );
}
