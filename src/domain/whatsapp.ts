import { Client, Contact, MessageMedia, RemoteWebCacheOptions } from "whatsapp-web.js";
import { EventType } from "../contracts/api.js";
import { Base64 } from "./types.js";
import { deleteFromCache, getFromCache } from "./cache.js";
import { verifyPurchaseWAId } from "./payments.js";
import { sendEvent } from "./ws.js";

const wwebVersion = "2.2407.3";
const clientOptions = {
  puppeteer: {
    executablePath:
      process.env.RUNNING_IN_DOCKER === "true" ? "/usr/bin/chromium-browser" : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  },
  webVersionCache: {
    type: "remote",
    remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`,
  } as RemoteWebCacheOptions,
};

export function initWhatsApp(id: string): Client {
  const client = new Client(clientOptions);

  client.on("qr", (qr: string) => {
    sendEvent(getFromCache(id, "ws"), EventType.WhatsAppQR, qr);
  });

  client.on("loading_screen", () => {
    sendEvent(getFromCache(id, "ws"), EventType.WhatsAppConnecting);
  });

  client.on("ready", async () => {
    const ws = getFromCache(id, "ws");
    const email = getFromCache(id, "email");
    if (await verifyPurchaseWAId(email, client.info.wid.user)) {
      sendEvent(ws, EventType.Redirect, "/gauth");
      return;
    }

    deleteFromCache(id, "whatsapp");
    deleteFromCache(id, "purchased");
    try {
      client.destroy();
    } catch {}
    sendEvent(ws, EventType.Redirect, "/contribute?show_error=true");
  });

  client.initialize();
  return client;
}

export async function loadContacts(client: Client): Promise<Map<string, string>> {
  const contacts: Contact[] = await client.getContacts();
  const map: Map<string, string> = new Map();
  contacts.forEach((contact) => {
    if (contact.id.user && contact.id._serialized) {
      map.set(contact.id.user, contact.id._serialized);
    }
  });
  return map;
}

export async function downloadFile(client: Client, whatsappId: string): Promise<Base64 | null> {
  let photoUrl: string | undefined;
  try {
    photoUrl = await client.getProfilePicUrl(whatsappId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRecoverableLookupError =
      errorMessage.includes("findChat: new chat not found") ||
      errorMessage.includes("Cannot read properties of undefined (reading 'getChat')");
    if (isRecoverableLookupError) return null;
    throw error;
  }

  if (!photoUrl) return null;
  const image = await MessageMedia.fromUrl(photoUrl);
  return image.data;
}
