import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sites, resources, targets, exitNodes, routes } from '@server/db/schema';
import { db } from '@server/db';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import logger from '@server/logger';
import stoi from '@server/utils/stoi';

// Define Zod schema for request validation
const getConfigSchema = z.object({
    publicKey: z.string(),
});

export type GetConfigResponse = {
    listenPort: number;
    ipAddress: string;
    peers: {
        publicKey: string | null;
        allowedIps: string[];
    }[];
}

export async function getConfig(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        // Validate request parameters
        const parsedParams = getConfigSchema.safeParse(req.query);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { publicKey } = parsedParams.data;

        if (!publicKey) {
            return next(createHttpError(HttpCode.BAD_REQUEST, 'publicKey is required'));
        }

        // Fetch exit node
        let exitNode = await db.select().from(exitNodes).where(eq(exitNodes.publicKey, publicKey));

        if (!exitNode) {
            const address = await getNextAvailableSubnet();
            // create a new exit node
            exitNode = await db.insert(exitNodes).values({
                publicKey,
                address,
                listenPort: 51820,
                name: `Exit Node ${publicKey.slice(0, 8)}`,
            }).returning().execute();

            // create a route
            await db.insert(routes).values({
                exitNodeId: exitNode[0].exitNodeId,
                subnet: address,
            }).returning().execute();
        }

        if (!exitNode) {
            return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "Failed to create exit node"));
        }

        // Fetch sites for this exit node
        const sitesRes = await db.query.sites.findMany({
            where: eq(sites.exitNode, exitNode[0].exitNodeId),
        });

        const peers = await Promise.all(sitesRes.map(async (site) => {
            // Fetch resources for this site
            const resourcesRes = await db.query.resources.findMany({
                where: eq(resources.siteId, site.siteId),
            });

            // Fetch targets for all resources of this site
            const targetIps = await Promise.all(resourcesRes.map(async (resource) => {
                const targetsRes = await db.query.targets.findMany({
                    where: eq(targets.resourceId, resource.resourceId),
                });
                return targetsRes.map(target => `${target.ip}/32`);
            }));

            return {
                publicKey: site.pubKey,
                allowedIps: targetIps.flat(),
            };
        }));

        const config: GetConfigResponse = {
            listenPort: exitNode[0].listenPort || 51820,
            ipAddress: exitNode[0].address,
            peers,
        };

        return response(res, {
            data: config,
            success: true,
            error: false,
            message: "Configuration retrieved successfully",
            status: HttpCode.OK,
        });

    } catch (error) {
        logger.error('Error from getConfig:', error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}

async function getNextAvailableSubnet(): Promise<string> {
    // Get all existing subnets from routes table
    const existingRoutes = await db.select({
        subnet: routes.subnet
    }).from(routes)
        .innerJoin(exitNodes, eq(routes.exitNodeId, exitNodes.exitNodeId));

    // Filter for only /16 subnets and extract the second octet
    const usedSecondOctets = new Set(
        existingRoutes
            .map(route => route.subnet)
            .filter(subnet => subnet.endsWith('/16'))
            .filter(subnet => subnet.startsWith('10.'))
            .map(subnet => {
                const parts = subnet.split('.');
                return parseInt(parts[1]);
            })
    );

    // Find the first available number between 0 and 255
    let nextOctet = 0;
    while (usedSecondOctets.has(nextOctet)) {
        nextOctet++;
        if (nextOctet > 255) {
            throw new Error('No available /16 subnets remaining in 10.0.0.0/8 space');
        }
    }

    return `10.${nextOctet}.0.0/16`;
}
