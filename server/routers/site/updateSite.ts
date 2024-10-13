import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { sites } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

// Define Zod schema for request parameters validation
const updateSiteParamsSchema = z.object({
    siteId: z.string().transform(Number).pipe(z.number().int().positive())
});

// Define Zod schema for request body validation
const updateSiteBodySchema = z.object({
    name: z.string().min(1).max(255).optional(),
    subdomain: z.string().min(1).max(255).optional(),
    pubKey: z.string().optional(),
    subnet: z.string().optional(),
    exitNode: z.number().int().positive().optional(),
    megabytesIn: z.number().int().nonnegative().optional(),
    megabytesOut: z.number().int().nonnegative().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
});

export async function updateSite(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        // Validate request parameters
        const parsedParams = updateSiteParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        // Validate request body
        const parsedBody = updateSiteBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { siteId } = parsedParams.data;
        const updateData = parsedBody.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.updateSite, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // Update the site in the database
        const updatedSite = await db.update(sites)
            .set(updateData)
            .where(eq(sites.siteId, siteId))
            .returning();

        if (updatedSite.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Site with ID ${siteId} not found`
                )
            );
        }

        return response(res, {
            data: updatedSite[0],
            success: true,
            error: false,
            message: "Site updated successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
