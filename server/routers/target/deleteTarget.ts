import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { targets } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const deleteTargetSchema = z.object({
    targetId: z.string().transform(Number).pipe(z.number().int().positive())
});

export async function deleteTarget(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = deleteTargetSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { targetId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.deleteTarget, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
        }

        const deletedTarget = await db.delete(targets)
            .where(eq(targets.targetId, targetId))
            .returning();

        if (deletedTarget.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Target with ID ${targetId} not found`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Target deleted successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
