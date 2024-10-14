import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { userOrgs, roles } from '@server/db/schema';
import { eq, and } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const addUserRoleSchema = z.object({
    userId: z.string(),
    roleId: z.number().int().positive(),
    orgId: z.string()
});

export async function addUserRole(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedBody = addUserRoleSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { userId, roleId, orgId } = parsedBody.data;

        // Check if the user has permission to add user roles
        const hasPermission = await checkUserActionPermission(ActionsEnum.addUserRole, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // Check if the role exists and belongs to the specified org
        const roleExists = await db.select()
            .from(roles)
            .where(and(eq(roles.roleId, roleId), eq(roles.orgId, orgId)))
            .limit(1);

        if (roleExists.length === 0) {
            return next(createHttpError(HttpCode.NOT_FOUND, 'Role not found or does not belong to the specified organization'));
        }

        const newUserRole = await db.update(userOrgs)
            .set({ roleId })
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId)))
            .returning();

        return response(res, {
            data: newUserRole[0],
            success: true,
            error: false,
            message: "Role added to user successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}