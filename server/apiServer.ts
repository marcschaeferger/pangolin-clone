import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "@server/lib/config";
import logger from "@server/logger";
import {
    errorHandlerMiddleware,
    notFoundMiddleware,
    rateLimitMiddleware
} from "@server/middlewares";
import { authenticated, unauthenticated } from "@server/routers/external";
import { router as wsRouter, handleWSUpgrade } from "@server/routers/ws";
import { logIncomingMiddleware } from "./middlewares/logIncoming";
import { csrfProtectionMiddleware } from "./middlewares/csrfProtection";
import helmet from "helmet";

const dev = process.env.ENVIRONMENT !== "prod";
const externalPort = config.getRawConfig().server.external_port;

export function createApiServer() {
    const apiServer = express();

    // Middleware setup
    apiServer.set("trust proxy", 1);
    if (dev) {
        apiServer.use(
            cors({
                origin: `http://localhost:${config.getRawConfig().server.next_port}`,
                credentials: true
            })
        );
    } else {
        const corsOptions = {
            origin: config.getRawConfig().app.dashboard_url,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            allowedHeaders: ["Content-Type", "X-CSRF-Token"]
        };

        apiServer.use(cors(corsOptions));
        apiServer.use(helmet());
        apiServer.use(csrfProtectionMiddleware);
    }

    apiServer.use(cookieParser());
    apiServer.use(express.json());

    if (!dev) {
        apiServer.use(
            rateLimitMiddleware({
                windowMin: config.getRawConfig().rate_limits.global.window_minutes,
                max: config.getRawConfig().rate_limits.global.max_requests,
                type: "IP_AND_PATH"
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
        logger.info(
            `API server is running on http://localhost:${externalPort}`
        );
    });

    // Handle WebSocket upgrades
    handleWSUpgrade(httpServer);

    return httpServer;
}
