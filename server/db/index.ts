import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@server/db/schema";
import path from "path";
import fs from "fs/promises";
import { APP_PATH } from "@server/consts";

export const location = path.join(APP_PATH, "db", "db.sqlite");
export const exists = await checkFileExists(location);

const sqlite = new Database(location);
export const db = drizzle(sqlite, { schema });

export default db;

async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}
