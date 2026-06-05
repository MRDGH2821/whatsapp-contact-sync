import { Auth } from "googleapis";
import { RateLimiter } from "limiter";
import WebSocket from "ws";
import { Client } from "whatsapp-web.js";
import { EventType, SyncOptions } from "../contracts/api.js";
import { getFromCache } from "./cache.js";
import { SimpleContact } from "./interfaces.js";
import { listContacts, updateContactPhoto } from "./gapi.js";
import { downloadFile, loadContacts } from "./whatsapp.js";
import { sendEvent, sendMessageAndWait } from "./ws.js";

const getGooglePhotoAsBase64 = async (googleContact: SimpleContact): Promise<string | null> => {
  if (!googleContact.photoUrl) return null;
  const googlePhotoData = await fetch(googleContact.photoUrl);
  const googlePhotoBlob = await googlePhotoData.blob();
  const googlePhotoArrayBuffer = await googlePhotoBlob.arrayBuffer();
  return googlePhotoArrayBuffer.byteLength !== 0
    ? Buffer.from(googlePhotoArrayBuffer).toString("base64")
    : null;
};

export async function initSync(id: string, syncOptions: SyncOptions) {
  const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 1500 });
  const ws: WebSocket = getFromCache(id, "ws");
  const whatsappClient: Client = getFromCache(id, "whatsapp");
  const gAuth: Auth.OAuth2Client = getFromCache(id, "gauth");

  let googleContacts: SimpleContact[];
  let whatsappContacts: Map<string, string>;
  try {
    googleContacts = await listContacts(gAuth);
    whatsappContacts = await loadContacts(whatsappClient);
    sendEvent(ws, EventType.SyncProgress, {
      progress: 0,
      syncCount: 0,
      isManualSync: syncOptions.manual_sync === "true",
    });
  } catch (error) {
    console.error("[SERVER] Failed initializing sync", error);
    if (ws.readyState === WebSocket.OPEN) {
      sendEvent(ws, EventType.SyncProgress, {
        progress: 0,
        syncCount: 0,
        error: "Failed to load contacts, please try again.",
      });
    }
    return;
  }

  let syncCount = 0;
  let photo: string | null = null;
  const shuffledGoogleContacts = googleContacts.sort(() => Math.random() - 0.5);

  for (const [index, googleContact] of shuffledGoogleContacts.entries()) {
    if (ws.readyState !== WebSocket.OPEN) return;
    const isManualSync = syncOptions.manual_sync === "true";
    if (!isManualSync && syncOptions.overwrite_photos === "false" && googleContact.hasPhoto) {
      continue;
    }

    for (const phoneNumber of googleContact.numbers) {
      let whatsappContactId: string | undefined;
      if (!whatsappContacts.has(phoneNumber) && phoneNumber.slice(0, 2) === "55") {
        whatsappContactId =
          phoneNumber.length === 12
            ? whatsappContacts.get(phoneNumber.slice(0, 4) + "9" + phoneNumber.slice(4))
            : whatsappContacts.get(phoneNumber.slice(0, 4) + phoneNumber.slice(5));
      } else {
        whatsappContactId = whatsappContacts.get(phoneNumber);
      }
      if (!whatsappContactId) continue;

      photo = await downloadFile(whatsappClient, whatsappContactId);
      if (photo === null) break;
      await limiter.removeTokens(1);

      if (isManualSync) {
        let message: any;
        try {
          const googlePhoto = await getGooglePhotoAsBase64(googleContact);
          message = await sendMessageAndWait(
            ws,
            EventType.SyncConfirm,
            EventType.SyncPhotoConfirm,
            {
              existingPhoto: googlePhoto,
              newPhoto: photo,
              contactName: googleContact.name,
            },
          );
        } catch (error) {
          console.error("[SERVER] Manual sync confirmation failed", error);
          continue;
        }
        if (message.accept) {
          await updateContactPhoto(gAuth, googleContact.id, photo);
        }
      } else {
        await updateContactPhoto(gAuth, googleContact.id, photo);
      }

      syncCount++;
      break;
    }

    sendEvent(ws, EventType.SyncProgress, {
      progress: (index / googleContacts.length) * 100,
      syncCount,
      totalContacts: googleContacts.length,
      image: photo,
      isManualSync,
    });
    photo = null;
  }

  sendEvent(ws, EventType.SyncProgress, { progress: 100, syncCount });
  ws.close();
}
