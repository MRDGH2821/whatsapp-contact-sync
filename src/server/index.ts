import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import expressSession from "express-session";
import expressWinston from "express-winston";
import expressWs from "express-ws";
import MemoryStore from "memorystore";
import { createServer as createViteServer } from "vite";
import winston from "winston";
import apiRouter from "./api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || "8080");
const routePrefix = process.env.ROUTE_PREFIX || "";
const secret = process.env.SESSION_SECRET || "secret";
const mStore = MemoryStore(expressSession);

async function createApp() {
  const ews = expressWs(express());
  const app = ews.app;
  app.use(
    cors({
      origin: [process.env.ORIGIN || "http://localhost:8080"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    }),
  );
  app.use(bodyParser.json());
  app.use(cookieParser(secret));
  app.use(
    expressSession({
      secret,
      store: new mStore({ checkPeriod: 86400000 }),
      cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: false, secure: isProd },
      resave: false,
      saveUninitialized: true,
    }),
  );
  app.use((req: Request, res: Response, next: CallableFunction) => {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Origin", process.env.ORIGIN);
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    next();
  });

  if (isProd) app.set("trust proxy", 1);
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      format: winston.format.combine(winston.format.colorize(), winston.format.json()),
      expressFormat: true,
      colorize: false,
    }),
  );
  app.disable("etag");
  app.use(`${routePrefix}/api`, apiRouter);

  let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use("/assets", express.static(path.resolve(__dirname, "../../client/assets")));
  }

  app.use("*", async (req: Request, res: Response) => {
    try {
      const url = req.originalUrl;
      const templatePath = isProd
        ? path.resolve(__dirname, "../../client/index.html")
        : path.resolve(process.cwd(), "index.html");
      let template = await fs.readFile(templatePath, "utf-8");
      let render: (url: string) => Promise<{ appHtml: string }>;

      if (!isProd && vite) {
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule("/src/app/entry-server.ts")).render;
      } else {
        render = (await import("../../dist/client/entry-server.js")).render;
      }

      const { appHtml } = await render(url);
      const html = template.replace("<!--ssr-outlet-->", appHtml);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      if (!isProd && vite) vite.ssrFixStacktrace(error as Error);
      console.error(error);
      res.status(500).end("Internal Server Error");
    }
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`[SERVER] Listening on port: ${port}`);
  });
}

createApp();
