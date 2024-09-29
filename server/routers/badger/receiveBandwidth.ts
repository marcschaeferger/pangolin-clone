import { Request, Response, NextFunction } from 'express';
import { DrizzleError, eq } from 'drizzle-orm';
import { sites, resources, targets, exitNodes } from '@server/db/schema';
import db from '@server/db';
import logger from '@server/logger';

interface PeerBandwidth {
  publicKey: string;
  bytesIn: number;
  bytesOut: number;
}

export const receiveBandwidth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bandwidthData: PeerBandwidth[] = req.body;

    if (!Array.isArray(bandwidthData)) {
      throw new Error('Invalid bandwidth data');
    }

    for (const peer of bandwidthData) {
      const { publicKey, bytesIn, bytesOut } = peer;

      // Find the site by public key
      const site = await db.query.sites.findFirst({
        where: eq(sites.pubKey, publicKey),
      });

      if (!site) {
        logger.warn(`Site not found for public key: ${publicKey}`);
        continue;
      }

      // Update the site's bandwidth usage
      await db.update(sites)
        .set({
          megabytesIn: (site.megabytesIn || 0) + bytesIn,
          megabytesOut: (site.megabytesOut || 0) + bytesOut,
        })
        .where(eq(sites.siteId, site.siteId));

        logger.debug(`Updated bandwidth for site: ${site.siteId}: megabytesIn: ${(site.megabytesIn || 0) + bytesIn}, megabytesOut: ${(site.megabytesOut || 0) + bytesOut}`);
        
    }

    res.status(200).json({ message: 'Bandwidth data updated successfully' });
  } catch (error) {
    console.error('Error updating bandwidth data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function calculateSubnet(index: number): string {
  const baseIp = 10 << 24;
  const subnetSize = 16;
  return `${(baseIp | (index * subnetSize)).toString()}/28`;
}
