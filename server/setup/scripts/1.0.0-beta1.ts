import logger from "@server/logger";

export default async function migration() {
    logger.info("Running setup script 1.0.0-beta.1");
    // SQL operations would go here in ts format
    logger.info("Done...");
}
