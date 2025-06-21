import { drizzle as DrizzlePostgres } from "drizzle-orm/node-postgres";
import { readConfigFile } from "@server/lib/readConfigFile";
import { withReplicas } from "drizzle-orm/pg-core";

function createDb() {
    const config = readConfigFile();

    if (!config.postgres) {
        throw new Error(
            "Postgres configuration is missing in the configuration file."
        );
    }

    const connectionString = config.postgres?.connection_string;
    const replicaConnections = config.postgres?.replicas || [];

    if (!connectionString) {
        throw new Error(
            "A primary db connection string is required in the configuration file."
        );
    }

    const primary = DrizzlePostgres(connectionString);
    const replicas = [];

    if (!replicaConnections.length) {
        replicas.push(primary);
    } else {
        for (const conn of replicaConnections) {
            const replica = DrizzlePostgres(conn.connection_string);
            replicas.push(replica);
        }
    }

    return withReplicas(primary, replicas as any);
}

export const db = createDb();
export default db;
