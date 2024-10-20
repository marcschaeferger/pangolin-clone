import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { roleSites, sites } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const listRoleSitesSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function listRoleSites(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = listRoleSitesSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { roleId } = parsedParams.data;

        // Check if the user has permission to list role sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.listRoleSites, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const roleSitesList = await db
            .select({
                siteId: sites.siteId,
                name: sites.name,
            })
            .from(roleSites)
            .innerJoin(sites, eq(roleSites.siteId, sites.siteId))
            .where(eq(roleSites.roleId, roleId));

            // TODO: Do we need to filter out what the user can see?

        return response(res, {
            data: roleSitesList,
            success: true,
            error: false,
            message: "Role sites retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}