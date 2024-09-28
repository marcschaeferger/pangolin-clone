import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@server/db/schema";
import environment from "@server/environment";

const sqlite = new Database(`${environment.CONFIG_PATH}/db/db.sqlite`);
export const db = drizzle(sqlite, { schema });

export default db;
