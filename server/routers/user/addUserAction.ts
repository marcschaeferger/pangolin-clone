import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { userActions, users } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';
import { eq } from 'drizzle-orm';

const addUserActionSchema = z.object({
    userId: z.string(),
    actionId: z.string(),
    orgId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function addUserAction(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedBody = addUserActionSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { userId, actionId, orgId } = parsedBody.data;

        // Check if the user has permission to add user actions
        const hasPermission = await checkUserActionPermission(ActionsEnum.addUserAction, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // Check if the user exists
        const user = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
        if (user.length === 0) {
            return next(createHttpError(HttpCode.NOT_FOUND, `User with ID ${userId} not found`));
        }

        const newUserAction = await db.insert(userActions).values({
            userId,
            actionId,
            orgId,
        }).returning();

        return response(res, {
            data: newUserAction[0],
            success: true,
            error: false,
            message: "Action added to user successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
