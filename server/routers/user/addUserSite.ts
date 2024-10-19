import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { resources, userResources, userSites } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';
import { eq } from 'drizzle-orm';

const addUserSiteSchema = z.object({
    userId: z.string(),
            siteId: z.string().optional().transform(stoi).pipe(z.number().int().positive().optional()),
});

export async function addUserSite(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedBody = addUserSiteSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { userId, siteId } = parsedBody.data;

        // Check if the user has permission to add user sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.addUserSite, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const newUserSite = await db.insert(userSites).values({
            userId,
            siteId,
        }).returning();

        // Add all resources associated with the site to the user
        const siteResources = await db.select()
            .from(resources)
            .where(eq(resources.siteId, siteId));

        for (const resource of siteResources) {
            await db.insert(userResources).values({
                userId,
                resourceId: resource.resourceId,
            });
        }

        return response(res, {
            data: newUserSite[0],
            success: true,
            error: false,
            message: "Site added to user successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}