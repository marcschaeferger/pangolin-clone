import { Request, Response, NextFunction } from 'express';
import { DrizzleError, eq } from 'drizzle-orm';
import { sites, resources, targets, exitNodes } from '../../db/schema';
import db from '../../db';

export const getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.query.exitNodeId) {
            throw new Error('Missing exitNodeId query parameter');
        }
        const exitNodeId = parseInt(req.query.exitNodeId as string);

        // Fetch exit node
        const exitNode = await db.query.exitNodes.findFirst({
            where: eq(exitNodes.exitNodeId, exitNodeId),
        });

        if (!exitNode) {
            throw new Error('Exit node not found');
        }

        // Fetch sites for this exit node
        const sitesRes = await db.query.sites.findMany({
            where: eq(sites.exitNode, exitNodeId),
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

        const config = {
            privateKey: exitNode.privateKey,
            listenPort: exitNode.listenPort,
            ipAddress: exitNode.address,
            peers,
        };


        res.json(config);
    } catch (error) {
        console.error('Error querying database:', error);
        if (error instanceof DrizzleError) {
            res.status(500).json({ error: 'Database query error', message: error.message });
        } else {
            next(error);
        }
    }
};

function calculateSubnet(index: number): string {
    const baseIp = 10 << 24;
    const subnetSize = 16;
    return `${(baseIp | (index * subnetSize)).toString()}/28`;
}
