import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { sites } from '@server/db/schema';
import { eq, and } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';
import stoi from '@server/utils/stoi';

// Define Zod schema for request parameters validation
const getSiteSchema = z.object({
            siteId: z.string().optional().transform(stoi).pipe(z.number().int().positive().optional()).optional(),
    niceId: z.string().optional(),
    orgId: z.string().optional(),
});

export type GetSiteResponse = {
    siteId: number;
    name: string;
    subdomain: string;
    subnet: string;
}

export async function getSite(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        // Validate request parameters
        const parsedParams = getSiteSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { siteId, niceId, orgId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.updateSite, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        let site;
        // Fetch the site from the database
        if (siteId) {
            site = await db.select()
                .from(sites)
                .where(eq(sites.siteId, siteId))
                .limit(1);
        } else if (niceId && orgId) {
            site = await db.select()
                .from(sites)
                .where(and(eq(sites.niceId, niceId), eq(sites.orgId, orgId)))
                .limit(1);
        }

        if (!site) {
            return next(createHttpError(HttpCode.NOT_FOUND, 'Site not found'));
        }

        if (site.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Site with ID ${siteId} not found`
                )
            );
        }

        return response(res, {
            data: {
                siteId: site[0].siteId,
                niceId: site[0].niceId,
                name: site[0].name,
                subnet: site[0].subnet,
            },
            success: true,
            error: false,
            message: "Site retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error("Error from getSite: ", error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
