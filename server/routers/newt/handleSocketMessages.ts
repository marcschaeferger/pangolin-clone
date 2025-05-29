import { MessageHandler } from "../ws";
import logger from "@server/logger";
import { dockerSocketCache } from "./dockerSocket";

export const handleDockerStatusMessage: MessageHandler = async (context) => {
    const { message, newt } = context;

    logger.info("Handling Docker socket check response");

    if (!newt) {
        logger.warn("Newt not found");
        return;
    }

    logger.info(`Newt ID: ${newt.newtId}, Site ID: ${newt.siteId}`);
    const { available, socketPath } = message.data;

    logger.info(
        `Docker socket availability for Newt ${newt.newtId}: available=${available}, socketPath=${socketPath}`
    );

    if (available) {
        logger.info(`Newt ${newt.newtId} has Docker socket access`);
        dockerSocketCache.set(`${newt.newtId}:socketPath`, socketPath, 0);
        dockerSocketCache.set(`${newt.newtId}:isAvailable`, available, 0);
    } else {
        logger.warn(`Newt ${newt.newtId} does not have Docker socket access`);
    }

    return;
};

export const handleDockerContainersMessage: MessageHandler = async (
    context
) => {
    const { message, newt } = context;

    logger.info("Handling Docker containers response");

    if (!newt) {
        logger.warn("Newt not found");
        return;
    }

    logger.info(`Newt ID: ${newt.newtId}, Site ID: ${newt.siteId}`);
    const { containers } = message.data;

    logger.info(
        `Docker containers for Newt ${newt.newtId}: ${containers ? containers.length : 0}`
    );

    if (containers && containers.length > 0) {
        dockerSocketCache.set(`${newt.newtId}:dockerContainers`, containers, 0);
    } else {
        logger.warn(`Newt ${newt.newtId} does not have Docker containers`);
    }
};
