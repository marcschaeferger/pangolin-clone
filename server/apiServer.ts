import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "@server/config";
import logger from "@server/logger";
import { errorHandlerMiddleware, notFoundMiddleware, rateLimitMiddleware } from "@server/middlewares";
import { authenticated, unauthenticated } from "@server/routers/external";
import { router as wsRouter, handleWSUpgrade } from "@server/routers/ws";
import { logIncomingMiddleware } from "./middlewares/logIncoming";

const dev = process.env.ENVIRONMENT !== "prod";
const externalPort = config.server.external_port;

export function createApiServer() {
  const apiServer = express();
  
  // Middleware setup
  apiServer.set("trust proxy", 1);
  apiServer.use(cors());
  apiServer.use(cookieParser());
  apiServer.use(express.json());
  
  if (!dev) {
    apiServer.use(
      rateLimitMiddleware({
        windowMin: config.rate_limit.window_minutes,
        max: config.rate_limit.max_requests,
        type: "IP_ONLY",
      })
    );
  }

  // API routes
  const prefix = `/api/v1`;
  apiServer.use(logIncomingMiddleware);
  apiServer.use(prefix, unauthenticated);
  apiServer.use(prefix, authenticated);
  
  // WebSocket routes
  apiServer.use(prefix, wsRouter);
  
  // Error handling
  apiServer.use(notFoundMiddleware);
  apiServer.use(errorHandlerMiddleware);

  // Create HTTP server
  const httpServer = apiServer.listen(externalPort, (err?: any) => {
    if (err) throw err;
    logger.info(`API server is running on http://localhost:${externalPort}`);
  });

  // Handle WebSocket upgrades
  handleWSUpgrade(httpServer);

  return httpServer;
}
