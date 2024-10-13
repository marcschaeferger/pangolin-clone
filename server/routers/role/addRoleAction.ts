import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { roleActions, roles } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const addRoleActionSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
    actionId: z.string(),
});

export async function addRoleAction(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedBody = addRoleActionSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { roleId, actionId } = parsedBody.data;

        // Check if the user has permission to add role actions
        const hasPermission = await checkUserActionPermission(ActionsEnum.addRoleAction, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // Get the orgId for the role
        const role = await db.select({ orgId: roles.orgId }).from(roles).where(eq(roles.roleId, roleId)).limit(1);
        if (role.length === 0) {
            return next(createHttpError(HttpCode.NOT_FOUND, `Role with ID ${roleId} not found`));
        }

        const newRoleAction = await db.insert(roleActions).values({
            roleId,
            actionId,
            orgId: role[0].orgId,
        }).returning();

        return response(res, {
            data: newRoleAction[0],
            success: true,
            error: false,
            message: "Action added to role successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}