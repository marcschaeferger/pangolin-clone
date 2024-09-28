import express, { Request, Response } from "express";
import next from "next";
import { parse } from "url";
import environment from "@server/environment";
import logger from "@server/logger";
import helmet from "helmet";
import cors from "cors";
import unauth from "@server/routers/unauth";
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const dev = environment.ENVIRONMENT !== "prod";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = environment.PORT;

let db: Database.Database;

app.prepare().then(() => {
    // Open the SQLite database connection
    const sqlite = new Database(`${environment.CONFIG_PATH}/db/db.sqlite`, { verbose: console.log });
    const db = drizzle(sqlite);
    

    const server = express();
    server.use(helmet());
    server.use(cors());

    // Run migrations (if you're using Drizzle's migration system)
    // migrate(db, { migrationsFolder: './drizzle' });
    
    // Middleware to attach the database to the request
    server.use((req, res, next) => {
      (req as any).db = db;
      next();
    });
    
    const prefix = `/api/${environment.API_VERSION}`;

    server.use(prefix, express.json(), unauth);


    // We are using NEXT from here on
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