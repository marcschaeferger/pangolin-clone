import { Request, Response, NextFunction } from 'express';
import { DrizzleError, eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sites, Site } from '../../db/schema';
import db from '../../db';

export const getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const exitNodeId = parseInt(req.query.exitNodeId as string);

    if (!db) {
      throw new Error('Database is not attached to the request');
    }


    const exitNode = await db.query.exitNodes.findFirst({
        where: {
            exitNodeId: eq(exitNodeId)
        },
        with: {
          routes: true,
          sites: {
            with: {
              resources: {
                with: {
                  targets: true
                }
              }
            }
          }
        }
      });
    
      if (!exitNode) {
        throw new Error('Exit node not found');
      }
    
      const config = {
        privateKey,
        listenPort,
        ipAddress: exitNode.address,
        peers: exitNode.sites.map((site, index) => ({
          publicKey: site.pubKey,
          allowedIps: site.resources.flatMap(resource => 
            resource.targets.map(target => target.ip)
          )
        }))
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
  