import { Request, Response, NextFunction } from "express";
import { DrizzleError, eq } from "drizzle-orm";
import { sites, resources, targets, exitNodes } from "@server/db/schema";
import db from "@server/db";
import logger from "@server/logger";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";

interface PeerBandwidth {
    publicKey: string;
    bytesIn: number;
    bytesOut: number;
}

export const receiveBandwidth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const bandwidthData: PeerBandwidth[] = req.body;

        if (!Array.isArray(bandwidthData)) {
            throw new Error("Invalid bandwidth data");
        }

        await db.transaction(async (trx) => {
            for (const peer of bandwidthData) {
                const { publicKey, bytesIn, bytesOut } = peer;

                // Find the site by public key
                const site = await trx.query.sites.findFirst({
                    where: eq(sites.pubKey, publicKey)
                });

                if (!site) {
                    logger.warn(`Site not found for public key: ${publicKey}`);
                    continue;
                }
                let online = site.online;

                // if the bandwidth for the site is > 0 then set it to online. if it has been less than 0 (no update) for 5 minutes then set it to offline
                if (bytesIn > 0 || bytesOut > 0) {
                    online = true;
                } else if (site.lastBandwidthUpdate) {
                    const lastBandwidthUpdate = new Date(
                        site.lastBandwidthUpdate
                    );
                    const currentTime = new Date();
                    const diff =
                        currentTime.getTime() - lastBandwidthUpdate.getTime();
                    if (diff < 300000) {
                        online = false;
                    }
                }

                // Update the site's bandwidth usage
                await trx
                    .update(sites)
                    .set({
                        megabytesIn: (site.megabytesIn || 0) + bytesIn,
                        megabytesOut: (site.megabytesOut || 0) + bytesOut,
                        lastBandwidthUpdate: new Date().toISOString(),
                        online
                    })
                    .where(eq(sites.siteId, site.siteId));
            }
        });

        return response(res, {
            data: {},
            success: true,
            error: false,
            message: "Organization retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error("Error updating bandwidth data:", error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
};

function calculateSubnet(index: number): string {
    const baseIp = 10 << 24;
    const subnetSize = 16;
    return `${(baseIp | (index * subnetSize)).toString()}/28`;
}
