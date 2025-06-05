import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sites, resources, targets, exitNodes } from "@server/db";
import { db } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import config from "@server/lib/config";
import { getUniqueExitNodeEndpointName } from "../../db/names";
import { findNextAvailableCidr } from "@server/lib/ip";
import { fromError } from "zod-validation-error";
import { getAllowedIps } from "../target/helpers";
// Define Zod schema for request validation
const getConfigSchema = z.object({
    publicKey: z.string(),
    reachableAt: z.string().optional()
});

export type GetConfigResponse = {
    listenPort: number;
    ipAddress: string;
    peers: {
        publicKey: string | null;
        allowedIps: string[];
    }[];
};

export async function getConfig(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        // Validate request parameters
        const parsedParams = getConfigSchema.safeParse(req.body);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { publicKey, reachableAt } = parsedParams.data;

        if (!publicKey) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "publicKey is required")
            );
        }

        // Fetch exit node
        let exitNodeQuery = await db
            .select()
            .from(exitNodes)
            .where(eq(exitNodes.publicKey, publicKey));
        let exitNode;
        if (exitNodeQuery.length === 0) {
            const address = await getNextAvailableSubnet();
            // TODO: eventually we will want to get the next available port so that we can multiple exit nodes
            // const listenPort = await getNextAvailablePort();
            const listenPort = config.getRawConfig().gerbil.start_port;
            let subEndpoint = "";
            if (config.getRawConfig().gerbil.use_subdomain) {
                subEndpoint = await getUniqueExitNodeEndpointName();
            }

            // create a new exit node
            exitNode = await db
                .insert(exitNodes)
                .values({
                    publicKey,
                    endpoint: `${subEndpoint}${subEndpoint != "" ? "." : ""}${config.getRawConfig().gerbil.base_endpoint}`,
                    address,
                    listenPort,
                    reachableAt,
                    name: `Exit Node ${publicKey.slice(0, 8)}`
                })
                .returning()
                .execute();

            logger.info(
                `Created new exit node ${exitNode[0].name} with address ${exitNode[0].address} and port ${exitNode[0].listenPort}`
            );
        } else {
            exitNode = exitNodeQuery;
        }

        if (!exitNode) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to create exit node"
                )
            );
        }

        const sitesRes = await db
            .select()
            .from(sites)
            .where(eq(sites.exitNodeId, exitNode[0].exitNodeId));

        const peers = await Promise.all(
            sitesRes.map(async (site) => {
                return {
                    publicKey: site.pubKey,
                    allowedIps: await getAllowedIps(site.siteId)
                };
            })
        );

        const configResponse: GetConfigResponse = {
            listenPort: exitNode[0].listenPort || 51820,
            ipAddress: exitNode[0].address,
            peers
        };

        logger.debug("Sending config: ", configResponse);

        return res.status(HttpCode.OK).send(configResponse);
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
}

async function getNextAvailableSubnet(): Promise<string> {
    // Get all existing subnets from routes table
    const existingAddresses = await db
        .select({
            address: exitNodes.address
        })
        .from(exitNodes);

    const addresses = existingAddresses.map((a) => a.address);
    let subnet = findNextAvailableCidr(
        addresses,
        config.getRawConfig().gerbil.block_size,
        config.getRawConfig().gerbil.subnet_group
    );
    if (!subnet) {
        throw new Error("No available subnets remaining in space");
    }

    // replace the last octet with 1
    subnet =
        subnet.split(".").slice(0, 3).join(".") +
        ".1" +
        "/" +
        subnet.split("/")[1];
    return subnet;
}

async function getNextAvailablePort(): Promise<number> {
    // Get all existing ports from exitNodes table
    const existingPorts = await db
        .select({
            listenPort: exitNodes.listenPort
        })
        .from(exitNodes);

    // Find the first available port between 1024 and 65535
    let nextPort = config.getRawConfig().gerbil.start_port;
    for (const port of existingPorts) {
        if (port.listenPort > nextPort) {
            break;
        }
        nextPort++;
        if (nextPort > 65535) {
            throw new Error("No available ports remaining in space");
        }
    }

    return nextPort;
}
