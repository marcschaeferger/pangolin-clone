import { ensureActions } from "./ensureActions";
import { copyInConfig } from "./copyInConfig";

export async function runSetupFunctions() {
    await ensureActions(); // make sure all of the actions are in the db and the roles
    await copyInConfig(); // copy in the config to the db as needed
}