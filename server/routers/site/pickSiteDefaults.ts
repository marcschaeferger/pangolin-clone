import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { exitNodes, sites } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { findNextAvailableCidr } from "@server/lib/ip";
import { generateId } from "@server/auth/sessions/app";
import config from "@server/lib/config";
import { OpenAPITags, registry } from "@server/openApi";
import { z } from "zod";

export type PickSiteDefaultsResponse = {
    exitNodeId: number;
    address: string;
    publicKey: string;
    name: string;
    listenPort: number;
    endpoint: string;
    subnet: string;
    newtId: string;
    newtSecret: string;
};

registry.registerPath({
    method: "get",
    path: "/org/{orgId}/pick-site-defaults",
    description:
        "Return pre-requisite data for creating a site, such as the exit node, subnet, Newt credentials, etc.",
    tags: [OpenAPITags.Org, OpenAPITags.Site],
    request: {
        params: z.object({
            orgId: z.string()
        })
    },
    responses: {}
});

export async function pickSiteDefaults(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        // TODO: more intelligent way to pick the exit node

        // make sure there is an exit node by counting the exit nodes table
        const nodes = await db.select().from(exitNodes);
        if (nodes.length === 0) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, "No exit nodes available")
            );
        }

        // get the first exit node
        const exitNode = nodes[0];

        // TODO: this probably can be optimized...
        // list all of the sites on that exit node
        const sitesQuery = await db
            .select({
                subnet: sites.subnet
            })
            .from(sites)
            .where(eq(sites.exitNodeId, exitNode.exitNodeId));

        // TODO: we need to lock this subnet for some time so someone else does not take it
        let subnets = sitesQuery.map((site) => site.subnet);
        // exclude the exit node address by replacing after the / with a site block size
        subnets.push(
            exitNode.address.replace(
                /\/\d+$/,
                `/${config.getRawConfig().gerbil.site_block_size}`
            )
        );
        const newSubnet = findNextAvailableCidr(
            subnets,
            config.getRawConfig().gerbil.site_block_size,
            exitNode.address
        );
        if (!newSubnet) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "No available subnets"
                )
            );
        }

        const newtId = generateId(15);
        const secret = generateId(48);

        return response<PickSiteDefaultsResponse>(res, {
            data: {
                exitNodeId: exitNode.exitNodeId,
                address: exitNode.address,
                publicKey: exitNode.publicKey,
                name: exitNode.name,
                listenPort: exitNode.listenPort,
                endpoint: exitNode.endpoint,
                subnet: newSubnet,
                newtId,
                newtSecret: secret
            },
            success: true,
            error: false,
            message: "Organization retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
