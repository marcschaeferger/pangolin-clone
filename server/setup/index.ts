import { ensureActions } from "./ensureActions";
import { copyInConfig } from "./copyInConfig";
import { setupServerAdmin } from "./setupServerAdmin";
import logger from "@server/logger";

export async function runSetupFunctions() {
    try {
        await copyInConfig(); // copy in the config to the db as needed
        await setupServerAdmin();
        await ensureActions(); // make sure all of the actions are in the db and the roles
    } catch (error) {
        logger.error("Error running setup functions:", error);
        process.exit(1);
    }
}
