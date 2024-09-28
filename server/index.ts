import express, { Request, Response } from "express";
import next from "next";
import { parse } from "url";
import environment from "@server/environment";
import logger from "@server/logger";
import helmet from "helmet";
import cors from "cors";
import internal from "@server/routers/internal";
import external from "@server/routers/external";

const dev = environment.ENVIRONMENT !== "prod";
const app = next({ dev });
const handle = app.getRequestHandler();
const mainPort = environment.EXTERNAL_PORT;
const internalPort = environment.INTERNAL_PORT;

app.prepare().then(() => {
    // Main server
    const mainServer = express();
    mainServer.use(helmet());
    mainServer.use(cors());

    const prefix = `/api/${environment.API_VERSION}`;
    mainServer.use(prefix, express.json(), external);

    // We are using NEXT from here on
    mainServer.all("*", (req: Request, res: Response) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    mainServer.listen(mainPort, (err?: any) => {
        if (err) throw err;
        logger.info(`Main server is running on http://localhost:${mainPort}`);
    });

    // Internal server
    const internalServer = express();
    internalServer.use(helmet());
    internalServer.use(cors());

    internalServer.use(prefix, express.json(), internal);

    internalServer.listen(internalPort, (err?: any) => {
        if (err) throw err;
        logger.info(
            `Internal server is running on http://localhost:${internalPort}`,
        );
    });
});

process.on("SIGINT", () => {
    process.exit(0);
});
