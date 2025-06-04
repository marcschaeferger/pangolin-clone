import Database from "better-sqlite3";
import path from "path";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { APP_PATH, configFilePath1, configFilePath2 } from "@server/lib/consts";

const version = "1.4.0";
const location = path.join(APP_PATH, "db", "db.sqlite");

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    const db = new Database(location);

    try {
        db.pragma("foreign_keys = OFF");
        db.transaction(() => {
            db.exec(`
               ALTER TABLE 'sites' ADD 'dockerSocketEnabled' integer DEFAULT true NOT NULL;
            `);
        })(); // <-- executes the transaction immediately
        db.pragma("foreign_keys = ON");
        console.log(`Migrated database schema`);
    } catch (e) {
        console.log("Unable to migrate database schema");
        throw e;
    }

    console.log(`${version} migration complete`);
}