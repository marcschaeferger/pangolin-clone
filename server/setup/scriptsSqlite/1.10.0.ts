import { APP_PATH } from "@server/lib/consts";
import Database from "better-sqlite3";
import path from "path";
import { db } from "@server/db/sqlite";

const version = "1.10.0";

export default async function migration() {
  console.log(`Running setup script ${version}...`);

  const location = path.join(APP_PATH, "db", "db.sqlite");
  const sqliteDb = new Database(location);

  try {
    // 1) Create ip_sets table
    sqliteDb.transaction(() => {
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS 'ip_sets' (
        'id' TEXT PRIMARY KEY,
        'name' TEXT NOT NULL UNIQUE,
        'description' TEXT,
        'ips' TEXT NOT NULL,
        'orgId' TEXT NOT NULL REFERENCES 'orgs' ('orgId') ON DELETE CASCADE,
        'created_at' INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        'updated_at' INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );
      `);
    })();

    console.log(`Created table 'ip_sets'`);

    // 2) Add ip_set_id column to resourceRules (nullable, FK)
    try {
      await db.run(`
        ALTER TABLE resourceRules
        ADD COLUMN ip_set_id TEXT
          REFERENCES ip_sets(id) ON DELETE CASCADE
      `);
      console.log(`Added column 'ip_set_id' to 'resourceRules'`);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (!/duplicate column name|already exists/i.test(msg)) {
        throw e;
      }
      console.log(`Column 'ip_set_id' already exists on 'resourceRules', skipping`);
    }
  } catch (e) {
    console.log("Unable to apply migration 1.10.0");
    throw e;
  }

  console.log(`${version} migration complete`);
}
