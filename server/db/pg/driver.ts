import { drizzle as DrizzlePostgres } from "drizzle-orm/node-postgres";
import { readConfigFile } from "@server/lib/readConfigFile";

function createDb() {
    const config = readConfigFile();

    const connectionString = config.postgres?.connection_string;

    if (!connectionString) {
        throw new Error("Postgres connection string is not defined in the configuration file.");
    }

    return DrizzlePostgres(connectionString);
}

export const db = createDb();
export default db;
