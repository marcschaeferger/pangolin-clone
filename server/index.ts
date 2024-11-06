import config from "@server/config";
import express, { Request, Response } from "express";
import next from "next";
import { parse } from "url";
import logger from "@server/logger";
import helmet from "helmet";
import cors from "cors";
import {
    errorHandlerMiddleware,
    notFoundMiddleware,
    rateLimitMiddleware,
} from "@server/middlewares";
import internal from "@server/routers/internal";
import { authenticated, unauthenticated } from "@server/routers/external";
import { router as wsRouter, handleWSUpgrade } from "@server/routers/ws";
import cookieParser from "cookie-parser";
import { User, UserOrg } from "@server/db/schema";
import { ensureActions } from "./db/ensureActions";
import { logIncomingMiddleware } from "./middlewares/logIncoming";

const dev = process.env.ENVIRONMENT !== "prod";

const app = next({ dev });
const handle = app.getRequestHandler();

const externalPort = config.server.external_port;
const internalPort = config.server.internal_port;

app.prepare().then(() => {
    ensureActions(); // This loads the actions into the database

    // External server
    const externalServer = express();
    externalServer.set("trust proxy", 1);

    // externalServer.use(helmet()); // Disabled because causes issues with Next.js
    externalServer.use(cors());
    externalServer.use(cookieParser());
    externalServer.use(express.json());
    if (!dev) {
        externalServer.use(
            rateLimitMiddleware({
                windowMin: config.rate_limit.window_minutes,
                max: config.rate_limit.max_requests,
                type: "IP_ONLY",
            })
        );
    }

    const prefix = `/api/v1`;
    externalServer.use(logIncomingMiddleware);
    externalServer.use(prefix, unauthenticated);
    externalServer.use(prefix, authenticated);
    externalServer.use(`${prefix}/ws`, wsRouter);

    externalServer.use(notFoundMiddleware);

    // We are using NEXT from here on
    externalServer.all("*", (req: Request, res: Response) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    const httpServer = externalServer.listen(externalPort, (err?: any) => {
        if (err) throw err;
        logger.info(
            `Main server is running on http://localhost:${externalPort}`
        );
    });

    handleWSUpgrade(httpServer);

    externalServer.use(errorHandlerMiddleware);

    // Internal server
    const internalServer = express();

    internalServer.use(helmet());
    internalServer.use(cors());
    internalServer.use(cookieParser());
    internalServer.use(express.json());

    internalServer.use(prefix, internal);

    internalServer.listen(internalPort, (err?: any) => {
        if (err) throw err;
        logger.info(
            `Internal server is running on http://localhost:${internalPort}`
        );
    });

    internalServer.use(notFoundMiddleware);
    internalServer.use(errorHandlerMiddleware);
});

declare global {
    // TODO: eventually make seperate types that extend express.Request
    namespace Express {
        interface Request {
            user?: User;
            userOrg?: UserOrg;
            userOrgRoleId?: number;
            userOrgId?: string;
            userOrgIds?: string[];
        }
    }
}
