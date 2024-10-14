import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { userActions } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const removeUserActionParamsSchema = z.object({
    userId: z.string(),
});

const removeUserActionSchema = z.object({
    actionId: z.string(),
    orgId: z.string().transform(Number).pipe(z.number().int().positive())
});

export async function removeUserAction(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = removeUserActionParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { userId } = parsedParams.data;

        const parsedBody = removeUserActionSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { actionId, orgId } = parsedBody.data;

        // Check if the user has permission to remove user actions
        const hasPermission = await checkUserActionPermission(ActionsEnum.removeUserAction, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const deletedUserAction = await db.delete(userActions)
            .where(and(
                eq(userActions.userId, userId),
                eq(userActions.actionId, actionId),
                eq(userActions.orgId, orgId)
            ))
            .returning();

        if (deletedUserAction.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Action with ID ${actionId} not found for user with ID ${userId} in organization ${orgId}`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Action removed from user successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}