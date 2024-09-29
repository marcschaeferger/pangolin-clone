import { Request, Response, NextFunction } from 'express';
import { DrizzleError, eq } from 'drizzle-orm';
import { sites, resources, targets, exitNodes } from '@server/db/schema';
import db from '@server/db';
import logger from '@server/logger';

interface CreateSiteRequest {
    publicKey: string;
    name: string;
    orgId: number;
}

export const createSite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const createSiteRequest: CreateSiteRequest = req.body;

    // pick a subdomain not used
    // pick a subnet not used
    // pick an exit node

    // const site = db
    // .insert(sites)
    // .values({
    //     orgId: createSiteRequest.orgId,
    //     exitNode: exitNodeId,
    //     name: createSiteRequest.name,
    //     subdomain: subdomain,
    //     pubKey: createSiteRequest.publicKey,
    //     subnet: subnet,
    // })
    // .returning()
    // .get();

    const site = {
        
    }

    res.status(200).json(site);
  } catch (error) {
    logger.error('Error creating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};