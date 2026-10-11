import { EventEmitter } from "events";

export type PanelEvent = { type: "message" | "conversation" | "status"; conversationId?: string };
const g = globalThis as unknown as { __bus?: EventEmitter };
export const bus = g.__bus ?? new EventEmitter();
bus.setMaxListeners(1000);
g.__bus = bus;

export const emit = (wid: string, e: PanelEvent) => bus.emit(`ws:${wid}`, e);
