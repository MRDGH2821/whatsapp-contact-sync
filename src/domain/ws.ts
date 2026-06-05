import WebSocket from "ws";
import { Event, EventType } from "../contracts/api.js";

export function sendEvent(
  ws: WebSocket,
  eventType: EventType,
  data: any = null,
): void {
  const event: Event = { type: eventType, data };
  if (!ws) return;
  ws.send(JSON.stringify(event));
}

export function sendMessageAndWait(
  ws: WebSocket,
  eventToSend: EventType,
  eventToWaitFor: EventType,
  message: any,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const handleMessage = (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed?.type === eventToWaitFor) {
          ws.off("message", handleMessage);
          resolve(parsed.data);
        }
      } catch (error) {
        console.error(
          `[SERVER] Failed parsing WS response while waiting for "${eventToWaitFor}"`,
          error,
        );
      }
    };

    ws.on("message", handleMessage);
    sendEvent(ws, eventToSend, message);

    setTimeout(() => {
      ws.off("message", handleMessage);
      reject(
        new Error(
          `Timeout waiting for WS response for "${eventToWaitFor}" after "${eventToSend}"`,
        ),
      );
    }, 30_000);
  });
}
