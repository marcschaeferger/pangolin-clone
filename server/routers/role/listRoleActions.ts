import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { roleActions, actions } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const listRoleActionsSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function listRoleActions(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = listRoleActionsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { roleId } = parsedParams.data;

        // Check if the user has permission to list role actions
        const hasPermission = await checkUserActionPermission(ActionsEnum.listRoleActions, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const roleActionsList = await db
            .select({
                actionId: actions.actionId,
                name: actions.name,
                description: actions.description,
            })
            .from(roleActions)
            .innerJoin(actions, eq(roleActions.actionId, actions.actionId))
            .where(eq(roleActions.roleId, roleId));

            // TODO: Do we need to filter out what the user can see?

        return response(res, {
            data: roleActionsList,
            success: true,
            error: false,
            message: "Role actions retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}