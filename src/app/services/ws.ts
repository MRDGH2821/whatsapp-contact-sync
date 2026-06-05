import { Event, EventType } from "@/contracts/api";
import { Deferred } from "../deferred";
import { HandlerFunction } from "../types";

const errorTimeout = 3000;
export let WS: WebSocket;
export const isWsReady: Deferred<boolean> = new Deferred();
const eventHandlers: { [eventType: string]: HandlerFunction } = {};

export async function initWs(): Promise<void> {
  if (WS && WS.readyState) return;
  await fetch("/api/", { credentials: "include" });
  const wsType = location.protocol === "https:" ? "wss" : "ws";
  WS = new WebSocket(`${wsType}://${location.host}/api/ws`);

  WS.onopen = () => {
    isWsReady.resolve(true);
  };
  WS.onerror = (wsEvent) => {
    console.error("[WEB] WS error:", wsEvent);
    setTimeout(() => {
      initWs();
    }, errorTimeout);
  };
  WS.onmessage = messageHandler;
}

async function messageHandler(wsEvent: MessageEvent): Promise<void> {
  const event: Event = JSON.parse(wsEvent.data);
  if (event.type in eventHandlers) {
    eventHandlers[event.type](event.data);
  } else {
    console.error(`[WEB] No event handler for ${event.type}`, event.type);
  }
}

export function addHandler(eventType: EventType, func: HandlerFunction): void {
  eventHandlers[eventType] = func;
}

export function sendEvent(eventType: EventType, data: any = null): void {
  if (!WS) return;
  WS.send(JSON.stringify({ type: eventType, data } as Event));
}
