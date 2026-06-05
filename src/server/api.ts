import express from "express";
import { Request, Response } from "express";
import WebSocket from "ws";
// @ts-ignore express-ws patch helper has no typed subpath exports.
import patch from "express-ws/lib/add-ws-method";
import { WAState } from "whatsapp-web.js";
import { SessionStatus, SyncOptions } from "../contracts/api.js";
import { deleteFromCache, getFromCache, setInCache } from "../domain/cache.js";
import { enforcePayments } from "../domain/config.js";
import { googleLogin } from "../domain/gapi.js";
import { checkPurchase } from "../domain/payments.js";
import { initSync } from "../domain/sync.js";
import { initWhatsApp } from "../domain/whatsapp.js";

const router = express.Router({ mergeParams: true });
patch(router);

function cleanup(sessionID: string) {
  const timeout = setTimeout(async () => {
    if (getFromCache(sessionID, "whatsapp") !== undefined) {
      try {
        const client = getFromCache(sessionID, "whatsapp");
        deleteFromCache(sessionID, "whatsapp");
        client.destroy();
      } catch {}
    }
    deleteFromCache(sessionID, "gauth");
    deleteFromCache(sessionID, "ws");
  }, 5 * 60 * 1000);
  setInCache(sessionID, "cleanup", timeout);
}

router.get("/", (_req: Request, res: Response) => res.send("{}"));
router.get("/health", (_req: Request, res: Response) =>
  res.json({
    status: "ok",
    message: "Server is healthy",
    uptime: `${Math.floor(process.uptime())}s`,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  }),
);

router.ws("/ws", (ws: WebSocket, req: Request) => {
  if (getFromCache(req.sessionID, "cleanup") !== undefined) {
    clearTimeout(getFromCache(req.sessionID, "cleanup"));
    deleteFromCache(req.sessionID, "cleanup");
  }
  ws.addEventListener("close", () => cleanup(req.sessionID));
  setInCache(req.sessionID, "ws", ws);
});

router.get("/status", async (req: Request, res: Response) => {
  let whatsappConnected = false;
  try {
    whatsappConnected =
      (await getFromCache(req.sessionID, "whatsapp")?.getState()) === WAState.CONNECTED;
  } catch {}
  const status: SessionStatus = {
    whatsappConnected,
    googleConnected: getFromCache(req.sessionID, "gauth") !== undefined,
    enforcePayments,
    purchased: enforcePayments ? getFromCache(req.sessionID, "purchased") : true,
  };
  res.send(status);
});

router.get("/init_whatsapp", (req: Request, res: Response) => {
  if (getFromCache(req.sessionID, "whatsapp") !== undefined) {
    try {
      const client = getFromCache(req.sessionID, "whatsapp");
      deleteFromCache(req.sessionID, "whatsapp");
      client.destroy();
    } catch {}
  }
  setInCache(req.sessionID, "whatsapp", initWhatsApp(req.sessionID));
  res.send("{}");
});

router.post("/init_gapi", (req: Request, res: Response) => {
  const token = req.body.token;
  setInCache(req.sessionID, "gauth", googleLogin(token));
  res.redirect("/options");
});

router.get("/init_sync", (req: Request, res: Response) => {
  initSync(req.sessionID, req.query as SyncOptions);
  res.send("{}");
});

router.post("/check_purchase", async (req: Request, res: Response) => {
  const email = req.body.email;
  const purchased = await checkPurchase(email);
  setInCache(req.sessionID, "purchased", purchased);
  setInCache(req.sessionID, "email", email);
  res.send({ purchased });
});

export default router;
