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
        sqliteDb.transaction(() => {
            // Create rule templates table
            sqliteDb.exec(`
                CREATE TABLE IF NOT EXISTS 'ruleTemplates' (
                    'templateId' text PRIMARY KEY,
                    'orgId' text NOT NULL,
                    'name' text NOT NULL,
                    'description' text,
                    'createdAt' integer NOT NULL,
                    FOREIGN KEY ('orgId') REFERENCES 'orgs' ('orgId') ON DELETE CASCADE
                );
            `);

            // Create template rules table
            sqliteDb.exec(`
                CREATE TABLE IF NOT EXISTS 'templateRules' (
                    'ruleId' integer PRIMARY KEY AUTOINCREMENT,
                    'templateId' text NOT NULL,
                    'enabled' integer NOT NULL DEFAULT 1,
                    'priority' integer NOT NULL,
                    'action' text NOT NULL,
                    'match' text NOT NULL,
                    'value' text NOT NULL,
                    FOREIGN KEY ('templateId') REFERENCES 'ruleTemplates' ('templateId') ON DELETE CASCADE
                );
            `);

            // Create resource templates table
            sqliteDb.exec(`
                CREATE TABLE IF NOT EXISTS 'resourceTemplates' (
                    'resourceId' integer NOT NULL,
                    'templateId' text NOT NULL,
                    PRIMARY KEY ('resourceId', 'templateId'),
                    FOREIGN KEY ('resourceId') REFERENCES 'resources' ('resourceId') ON DELETE CASCADE,
                    FOREIGN KEY ('templateId') REFERENCES 'ruleTemplates' ('templateId') ON DELETE CASCADE
                );
            `);
        })();

        console.log("Added rule template tables");

        // Add templateRuleId column to resourceRules table
        await db.run(`
            ALTER TABLE resourceRules 
            ADD COLUMN templateRuleId INTEGER 
            REFERENCES templateRules(ruleId) ON DELETE CASCADE
        `);

        console.log("Added templateRuleId column to resourceRules table");
    } catch (e) {
        console.log("Unable to add rule template tables and columns");
        throw e;
    }

    console.log(`${version} migration complete`);
}
