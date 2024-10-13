import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { roleSites, roles } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const listSiteRolesSchema = z.object({
    siteId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function listSiteRoles(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = listSiteRolesSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { siteId } = parsedParams.data;

        // Check if the user has permission to list site roles
        const hasPermission = await checkUserActionPermission(ActionsEnum.listSiteRoles, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const siteRolesList = await db
            .select({
                roleId: roles.roleId,
                name: roles.name,
                description: roles.description,
                isSuperuserRole: roles.isSuperuserRole,
            })
            .from(roleSites)
            .innerJoin(roles, eq(roleSites.roleId, roles.roleId))
            .where(eq(roleSites.siteId, siteId));

        return response(res, {
            data: siteRolesList,
            success: true,
            error: false,
            message: "Site roles retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}