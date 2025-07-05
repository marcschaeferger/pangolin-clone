import { APP_PATH } from "@server/lib/consts";
import Database from "better-sqlite3";
import path from "path";

const version = "1.7.0";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    const location = path.join(APP_PATH, "db", "db.sqlite");
    const db = new Database(location);

    try {
        db.pragma("foreign_keys = OFF");
        db.transaction(() => {
            // Add missing columns to tables
            db.exec(`
                ALTER TABLE orgs ADD COLUMN passwordResetTokenExpiryHours INTEGER NOT NULL DEFAULT 24;
                ALTER TABLE roles ADD COLUMN description TEXT;
                ALTER TABLE actions ADD COLUMN description TEXT;
                ALTER TABLE resourceAccessToken ADD COLUMN description TEXT;
            `);
        })(); // <-- executes the transaction immediately
        db.pragma("foreign_keys = ON");
        console.log(`Added missing columns to database tables`);
    } catch (e) {
        console.log("Error updating database schema:");
        console.log(e);
        throw e;
    }

    console.log(`${version} migration complete`);
} 