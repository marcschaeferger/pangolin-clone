import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "@server/config";
import logger from "@server/logger";
import { errorHandlerMiddleware, notFoundMiddleware } from "@server/middlewares";
import internal from "@server/routers/internal";

const internalPort = config.server.internal_port;

export function createInternalServer() {
  const internalServer = express();

  internalServer.use(helmet());
  internalServer.use(cors());
  internalServer.use(cookieParser());
  internalServer.use(express.json());

  const prefix = `/api/v1`;
  internalServer.use(prefix, internal);

  internalServer.use(notFoundMiddleware);
  internalServer.use(errorHandlerMiddleware);

  internalServer.listen(internalPort, (err?: any) => {
    if (err) throw err;
    logger.info(`Internal server is running on http://localhost:${internalPort}`);
  });

  return internalServer;
}