import { db } from "../../db/sqlite";
import { sql } from "drizzle-orm";

const version = "1.4.0";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    try {
        db.transaction((trx) => {
            trx.run(sql`CREATE TABLE 'securityKey' (
                'credentialId' text PRIMARY KEY NOT NULL,
                'userId' text NOT NULL,
                'publicKey' text NOT NULL,
                'signCount' integer NOT NULL,
                'transports' text,
                'name' text,
                'lastUsed' text NOT NULL,
                'dateCreated' text NOT NULL,
                FOREIGN KEY ('userId') REFERENCES 'user'('id') ON DELETE CASCADE
            );`);
        });

        console.log(`Migrated database schema`);
    } catch (e) {
        console.log("Unable to migrate database schema");
        throw e;
    }

    console.log(`${version} migration complete`);
} 