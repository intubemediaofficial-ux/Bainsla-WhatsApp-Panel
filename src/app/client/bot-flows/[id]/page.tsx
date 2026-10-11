"use client";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addEdge, Background, Controls, Handle, MiniMap, Position, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as I from "lucide-react";
import { api, Field, Spinner, toast } from "@/components/ui";

type D = Record<string, unknown>;
const TYPES: { type: string; label: string; icon: keyof typeof I; color: string }[] = [
  { type: "message", label: "Send message", icon: "MessageSquare", color: "#059669" },
  { type: "media", label: "Send media", icon: "Image", color: "#0ea5e9" },
  { type: "buttons", label: "Buttons (max 3)", icon: "RectangleHorizontal", color: "#8b5cf6" },
  { type: "list", label: "List menu", icon: "List", color: "#a855f7" },
  { type: "question", label: "Ask question", icon: "HelpCircle", color: "#f59e0b" },
  { type: "condition", label: "Condition", icon: "GitBranch", color: "#ef4444" },
  { type: "tag", label: "Add label", icon: "Tag", color: "#14b8a6" },
  { type: "ai", label: "AI reply", icon: "Sparkles", color: "#6366f1" },
  { type: "webhook", label: "Webhook", icon: "Webhook", color: "#64748b" },
  { type: "handover", label: "Human handover", icon: "Headset", color: "#f97316" },
  { type: "end", label: "End", icon: "CircleStop", color: "#334155" },
];
const meta = (t: string) => TYPES.find((x) => x.type === t) || { type: "start", label: "Start (trigger)", icon: "Play" as const, color: "#16a34a" };
const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

function FlowNode({ type, data, selected }: NodeProps) {
  const m = meta(type);
  const Ic = I[m.icon] as React.ComponentType<{ size?: number }>;
  const d = data as D;
  const outs = type === "buttons" ? list(d.buttons) : type === "list" ? list(d.items) : type === "condition" ? ["yes", "no"] : null;
  const summary = String(d.text || d.prompt || d.tag || d.url || (type === "condition" ? `${d.variable || "answer"} ${d.operator || "contains"} "${d.value || ""}"` : "") || "");
  return (
    <div className={`w-56 rounded-xl border bg-white shadow-sm ${selected ? "ring-2 ring-emerald-500" : "border-slate-200"}`}>
      {type !== "start" && <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-slate-400" />}
      <div className="flex items-center gap-2 rounded-t-xl px-3 py-2 text-xs font-semibold text-white" style={{ background: m.color }}><Ic size={14} /> {m.label}</div>
      <div className="line-clamp-3 px-3 py-2 text-[11px] text-slate-600">{summary || <span className="text-slate-300">click to edit</span>}</div>
      {outs ? outs.map((o, i) => (
        <div key={i} className="relative border-t border-slate-100 px-3 py-1.5 text-right text-[11px] font-medium text-slate-700">{o || `option ${i + 1}`}
          <Handle id={type === "condition" ? o : `${i}`} type="source" position={Position.Right} className="!h-3 !w-3" style={{ background: m.color }} />
        </div>
      )) : type !== "end" && type !== "handover" && <Handle type="source" position={Position.Right} className="!h-3 !w-3" style={{ background: m.color }} />}
    </div>
  );
}

export default function Builder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [flow, setFlow] = useState<{ name: string; triggers: string[]; active: boolean } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nodeTypes = useMemo(() => Object.fromEntries(["start", ...TYPES.map((t) => t.type)].map((t) => [t, FlowNode])), []);
  useEffect(() => {
    api<{ name: string; triggers: string[]; active: boolean; nodes: Node[]; edges: Edge[] }>(`/api/flows/${id}`).then((f) => { setFlow(f); setNodes(f.nodes); setEdges(f.edges.map((e) => ({ ...e, animated: true }))); });
  }, [id, setNodes, setEdges]);
  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, animated: true }, es.filter((e) => !(e.source === c.source && (e.sourceHandle || null) === (c.sourceHandle || null))))), [setEdges]);
  const node = nodes.find((n) => n.id === sel);
  const upd = (d: D) => setNodes((ns) => ns.map((n) => (n.id === sel ? { ...n, data: { ...n.data, ...d } } : n)));
  function add(type: string) {
    const nid = `${type}_${Math.random().toString(36).slice(2, 8)}`;
    const base: D = type === "buttons" ? { text: "Choose an option", buttons: ["Option 1", "Option 2"] } : type === "list" ? { text: "Our services", buttonText: "View", items: ["Item 1", "Item 2"] } : type === "condition" ? { variable: "answer", operator: "contains", value: "" } : type === "question" ? { text: "What is your name?", saveAs: "answer" } : { text: "" };
    setNodes((ns) => [...ns, { id: nid, type, position: { x: 120 + ns.length * 40, y: 80 + ns.length * 30 }, data: base }]);
    setSel(nid);
  }
  async function save(active?: boolean) {
    if (!flow) return;
    setBusy(true);
    try {
      await api(`/api/flows/${id}`, { method: "PATCH", json: { name: flow.name, triggers: flow.triggers, active: active ?? flow.active, nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })), edges: edges.map(({ id, source, target, sourceHandle }) => ({ id, source, target, sourceHandle })) } });
      if (active !== undefined) setFlow({ ...flow, active });
      toast("Flow saved");
    } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
  }
  if (!flow) return <div className="grid h-64 place-items-center text-emerald-600"><Spinner size={28} /></div>;
  const d = (node?.data || {}) as D;
  const str = (k: string) => String(d[k] ?? "");
  return (
    <div className="-m-4 flex h-[calc(100vh-61px)] flex-col md:-m-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <Link href="/client/bot-flows" className="text-slate-500 hover:text-emerald-700"><I.ArrowLeft size={18} /></Link>
        <input className="input w-56 py-1.5 font-semibold" value={flow.name} onChange={(e) => setFlow({ ...flow, name: e.target.value })} />
        <div className="flex items-center gap-2 text-xs text-slate-500">Trigger keywords:<input className="input w-64 py-1.5" value={flow.triggers.join(", ")} onChange={(e) => setFlow({ ...flow, triggers: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} placeholder="hi, hello, menu" /></div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => save()} disabled={busy} className="btn-ghost py-1.5">{busy ? <Spinner size={14} /> : <I.Save size={15} />} Save</button>
          <button onClick={() => save(!flow.active)} className={flow.active ? "btn-danger py-1.5" : "btn-primary py-1.5"}>{flow.active ? <><I.Pause size={15} /> Pause</> : <><I.Rocket size={15} /> Publish</>}</button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-52 shrink-0 space-y-1 overflow-y-auto border-r border-slate-200 bg-white p-3 scroll-thin">
          <div className="label">Add block</div>
          {TYPES.map((t) => { const Ic = I[t.icon] as React.ComponentType<{ size?: number }>; return <button key={t.type} onClick={() => add(t.type)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"><span className="grid h-7 w-7 place-items-center rounded-lg text-white" style={{ background: t.color }}><Ic size={14} /></span>{t.label}</button>; })}
        </div>
        <div className="flex-1 bg-slate-50">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)} fitView deleteKeyCode={["Delete", "Backspace"]}>
            <Background gap={18} /><Controls /><MiniMap pannable zoomable />
          </ReactFlow>
        </div>
        {node && node.type !== "start" && (
          <div className="w-80 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 bg-white p-4 scroll-thin">
            <div className="flex items-center justify-between"><b>{meta(node.type || "").label}</b><button onClick={() => { setNodes((ns) => ns.filter((n) => n.id !== sel)); setEdges((es) => es.filter((e) => e.source !== sel && e.target !== sel)); setSel(null); }} className="text-slate-400 hover:text-rose-600"><I.Trash2 size={16} /></button></div>
            {["message", "buttons", "list", "question", "handover"].includes(node.type || "") && <Field label="Message text" help="Use {{name}}, {{phone}} or saved answers like {{answer}}"><textarea className="input min-h-[100px]" value={str("text")} onChange={(e) => upd({ text: e.target.value })} /></Field>}
            {node.type === "media" && <><Field label="Type"><select className="input" value={str("mediaType") || "image"} onChange={(e) => upd({ mediaType: e.target.value })}>{["image", "video", "audio", "document"].map((t) => <option key={t}>{t}</option>)}</select></Field><Field label="Public media URL"><input className="input" value={str("url")} onChange={(e) => upd({ url: e.target.value })} /></Field><Field label="Caption"><input className="input" value={str("caption")} onChange={(e) => upd({ caption: e.target.value })} /></Field></>}
            {(node.type === "buttons" || node.type === "list") && (() => { const k = node.type === "buttons" ? "buttons" : "items"; const v = list(d[k]); const max = node.type === "buttons" ? 3 : 10; return (
              <div><div className="label">{node.type === "buttons" ? "Buttons (20 chars)" : "List items (24 chars)"}</div>
                {v.map((x, i) => <div key={i} className="mb-2 flex gap-2"><input className="input py-1.5" maxLength={node.type === "buttons" ? 20 : 24} value={x} onChange={(e) => upd({ [k]: v.map((y, j) => (j === i ? e.target.value : y)) })} /><button onClick={() => upd({ [k]: v.filter((_, j) => j !== i) })} className="text-slate-400"><I.X size={15} /></button></div>)}
                {v.length < max && <button onClick={() => upd({ [k]: [...v, ""] })} className="btn-ghost py-1 text-xs"><I.Plus size={14} /> Add</button>}
                {node.type === "list" && <Field label="Menu button text"><input className="input mt-2" value={str("buttonText")} onChange={(e) => upd({ buttonText: e.target.value })} /></Field>}
              </div>); })()}
            {["question", "buttons", "list"].includes(node.type || "") && <><Field label="Save reply as variable"><input className="input" value={str("saveAs")} onChange={(e) => upd({ saveAs: e.target.value })} placeholder={node.type === "question" ? "answer" : "choice"} /></Field>{node.type === "question" && <Field label="Also save to contact custom field (key)"><input className="input" value={str("saveToField")} onChange={(e) => upd({ saveToField: e.target.value })} placeholder="city" /></Field>}</>}
            {node.type === "condition" && <><Field label="Variable"><input className="input" value={str("variable")} onChange={(e) => upd({ variable: e.target.value })} /></Field><Field label="Operator"><select className="input" value={str("operator") || "contains"} onChange={(e) => upd({ operator: e.target.value })}><option value="contains">contains</option><option value="equals">equals</option></select></Field><Field label="Value"><input className="input" value={str("value")} onChange={(e) => upd({ value: e.target.value })} /></Field><div className="text-xs text-slate-500">Connect the <b>yes</b> and <b>no</b> outputs.</div></>}
            {node.type === "tag" && <Field label="Label to add"><input className="input" value={str("tag")} onChange={(e) => upd({ tag: e.target.value })} /></Field>}
            {node.type === "ai" && <Field label="Extra AI instruction (optional)"><textarea className="input min-h-[100px]" value={str("prompt")} onChange={(e) => upd({ prompt: e.target.value })} /></Field>}
            {node.type === "webhook" && <Field label="POST URL" help="Receives contact, saved variables and last input as JSON"><input className="input" value={str("url")} onChange={(e) => upd({ url: e.target.value })} /></Field>}
          </div>
        )}
      </div>
    </div>
  );
}
