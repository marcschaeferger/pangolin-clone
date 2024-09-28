import express, { Request, Response } from "express";
import next from "next";
import { parse } from "url";
import environment from "@server/environment";
import logger from "@server/logger";
import helmet from "helmet";
import cors from "cors";
import unauth from "@server/routers/unauth";

const dev = environment.ENVIRONMENT !== "prod";
const app = next({ dev });
const handle = app.getRequestHandler();

const port = environment.PORT;

app.prepare().then(() => {
    const server = express();

    server.use(helmet());
    server.use(cors());

    const prefix = `/api`;
    server.use(prefix, express.json(), unauth);

    server.all("*", (req: Request, res: Response) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    server.listen(port, (err?: any) => {
        if (err) {
            throw err;
        }
        logger.info(`Server is running on http://localhost:${port}`);
    });
});
