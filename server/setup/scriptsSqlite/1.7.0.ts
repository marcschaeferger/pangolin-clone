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
        })(); // executes the transaction immediately
        db.pragma("foreign_keys = ON");
        console.log(`Added passwordResetTokenExpiryHours column to orgs table`);
    } catch (e) {
        console.log("Error adding passwordResetTokenExpiryHours column to orgs table:");
        console.log(e);
    }

    try {
        db.pragma("foreign_keys = OFF");
        db.transaction(() => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS securityKey (
                    credentialId TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    publicKey TEXT NOT NULL,
                    signCount INTEGER NOT NULL,
                    transports TEXT,
                    name TEXT,
                    lastUsed TEXT NOT NULL,
                    dateCreated TEXT NOT NULL,
                    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
                );
            `);
        })(); // executes the transaction immediately
        db.pragma("foreign_keys = ON");
        console.log(`Created securityKey table`);
    } catch (e) {
        console.error("Unable to create securityKey table");
        console.error(e);
        throw e;
    }

    console.log(`${version} migration complete`);
} 