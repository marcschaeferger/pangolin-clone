import { APP_PATH } from "@server/lib/consts";
import Database from "better-sqlite3";
import path from "path";

const version = "1.8.0";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    const location = path.join(APP_PATH, "db", "db.sqlite");
    const db = new Database(location);

    try {
        db.pragma("foreign_keys = OFF");
        db.transaction(() => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS securityKeyChallenge (
                    sessionId TEXT PRIMARY KEY,
                    challenge TEXT NOT NULL,
                    securityKeyName TEXT,
                    userId TEXT,
                    expiresAt INTEGER NOT NULL,
                    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_securityKeyChallenge_expiresAt ON securityKeyChallenge(expiresAt);
            `);
        })(); // executes the transaction immediately
        db.pragma("foreign_keys = ON");
        console.log(`Created securityKeyChallenge table`);
    } catch (e) {
        console.error("Unable to create securityKeyChallenge table");
        console.error(e);
        throw e;
    }

    console.log(`${version} migration complete`);
} 