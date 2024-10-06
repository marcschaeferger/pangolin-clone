import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@server/db/schema";
import environment from "@server/environment";
import path from "path";

const location = path.join(environment.CONFIG_PATH, "db", "db.sqlite");

const sqlite = new Database(location);
export const db = drizzle(sqlite, { schema });

export default db;
