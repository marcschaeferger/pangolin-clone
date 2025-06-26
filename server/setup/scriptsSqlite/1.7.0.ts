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
            // Add passwordResetTokenExpiryHours column to orgs table with default value of 1
            db.exec(`
                ALTER TABLE orgs ADD COLUMN passwordResetTokenExpiryHours INTEGER NOT NULL DEFAULT 1;
            `);
        })(); // <-- executes the transaction immediately
        db.pragma("foreign_keys = ON");
        console.log(`Added passwordResetTokenExpiryHours column to orgs table`);
    } catch (e) {
        console.log("Error adding passwordResetTokenExpiryHours column to orgs table:");
        console.log(e);
        throw e;
    }

    console.log(`${version} migration complete`);
} 