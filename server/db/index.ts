import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@server/db/schema";
import { __DIRNAME, APP_PATH } from "@server/config";
import path from "path";
import fs from "fs";
import logger from "@server/logger";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const location = path.join(APP_PATH, "db", "db.sqlite");

let dbExists = true;
if (!fs.existsSync(location)) {
    dbExists = false;
}

const sqlite = new Database(location);
export const db = drizzle(sqlite, { schema });

if (!dbExists && process.env.ENVIRONMENT === "prod") {
    logger.info("Running migrations...");
    try {
        migrate(db, {
            migrationsFolder: path.join(__DIRNAME, "migrations"),
        });
        logger.info("Migrations completed successfully.");
    } catch (error) {
        logger.error("Error running migrations:", error);
        process.exit(1);
    }
}

export default db;
