import { getSession } from "@/lib/auth";
import { bus, PanelEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s?.wid) return new Response("Unauthorized", { status: 401 });
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (e: PanelEvent) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      const ping = setInterval(() => ctrl.enqueue(enc.encode(`: ping\n\n`)), 25000);
      bus.on(`ws:${s.wid}`, send);
      ctrl.enqueue(enc.encode(`: connected\n\n`));
      cleanup = () => {
        clearInterval(ping);
        bus.off(`ws:${s.wid}`, send);
      };
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
