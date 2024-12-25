import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@server/db/schema";
import { APP_PATH } from "@server/config";
import path from "path";

export const location = path.join(APP_PATH, "db", "db.sqlite");

const sqlite = new Database(location);
export const db = drizzle(sqlite, { schema });

export default db;
