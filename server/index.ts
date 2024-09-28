import express, { Request, Response } from "express";
import next from "next";
import { parse } from "url";
import environment from "@server/environment";
import logger from "@server/logger";
import helmet from "helmet";
import cors from "cors";
import unauth from "@server/routers/unauth";
import Database from 'better-sqlite3';

const dev = environment.ENVIRONMENT !== "prod";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = environment.PORT;

let db: Database.Database;

app.prepare().then(() => {
    // Open the SQLite database connection
    db = new Database(`${environment.CONFIG_PATH}/db/db.sqlite`, { verbose: console.log });

    const server = express();
    server.use(helmet());
    server.use(cors());

    const prefix = `/api/${environment.API_VERSION}`;

    // Middleware to attach db to req object
    server.use((req: Request & { db?: Database.Database }, res: Response, next) => {
        req.db = db;
        next();
    });

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

process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});