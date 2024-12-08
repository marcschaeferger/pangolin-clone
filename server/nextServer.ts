import next from "next";
import express from "express";
import { parse } from "url";
import logger from "@server/logger";
import config from "@server/config";

const nextPort = config.server.next_port;

export async function createNextServer() {
//   const app = next({ dev });
  const app = next({ dev: process.env.ENVIRONMENT !== "prod" });
  const handle = app.getRequestHandler();

  await app.prepare();

  const nextServer = express();

  nextServer.all("*", (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  nextServer.listen(nextPort, (err?: any) => {
    if (err) throw err;
    logger.info(`Next.js server is running on http://localhost:${nextPort}`);
  });

  return nextServer;
}