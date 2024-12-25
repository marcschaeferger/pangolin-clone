import { ensureActions } from "./ensureActions";
import { copyInConfig } from "./copyInConfig";
import logger from "@server/logger";
import { runMigrations } from "./migrations";
import { setupServerAdmin } from "./setupServerAdmin";

export async function runSetupFunctions() {
    try {
        logger.info(`Setup for version ${process.env.APP_VERSION}`);
        await runMigrations(); // run the migrations
        await copyInConfig(); // copy in the config to the db as needed
        await setupServerAdmin();
        await ensureActions(); // make sure all of the actions are in the db and the roles
    } catch (error) {
        logger.error("Error running setup functions", error);
        process.exit(1);
    }
}
