import { ensureActions } from "./ensureActions";
import { copyInConfig } from "./copyInConfig";
import { runMigrations } from "./migrations";
import { setupServerAdmin } from "./setupServerAdmin";
import { loadConfig } from "@server/config";

export async function runSetupFunctions() {
    try {
        await runMigrations(); // run the migrations

        console.log("Migrations completed successfully.")

        // ANYTHING BEFORE THIS LINE CANNOT USE THE CONFIG
        loadConfig();

        await copyInConfig(); // copy in the config to the db as needed
        await setupServerAdmin();
        await ensureActions(); // make sure all of the actions are in the db and the roles
    } catch (error) {
        console.error("Error running setup functions:", error);
        process.exit(1);
    }
}
