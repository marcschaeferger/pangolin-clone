import { ensureActions } from "./ensureActions";
import { copyInConfig } from "./copyInConfig";
import logger from "@server/logger";
import { runMigrations } from "./migrations";

export async function runSetupFunctions() {
    logger.info(`Setup for version ${process.env.APP_VERSION}`);
    await runMigrations(); // run the migrations       
    await ensureActions(); // make sure all of the actions are in the db and the roles
    await copyInConfig(); // copy in the config to the db as needed
}