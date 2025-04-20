import db from "@server/db";
import { sql } from "drizzle-orm";

const version = "1.3.0";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    try {
        db.transaction((trx) => {
            trx.run(
                sql`ALTER TABLE 'resources' ADD 'tlsServerName' text DEFAULT '' NOT NULL;`
            );
            trx.run(
                sql`ALTER TABLE 'resources' ADD 'setHostHeader' text DEFAULT '' NOT NULL;`
            );
        });

        console.log(`Migrated database schema`);
    } catch (e) {
        console.log("Unable to migrate database schema");
        throw e;
    }

    console.log(`${version} migration complete`);
}
