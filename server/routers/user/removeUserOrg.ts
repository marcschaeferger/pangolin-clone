import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { userOrgs, users } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const removeUserSchema = z.object({
    userId: z.string().uuid(),
    orgId: z.number().int().positive(),
});

export async function removeUserOrg(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = removeUserSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { userId, orgId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.removeUser, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // remove the user from the userOrgs table
        await db.delete(userOrgs)
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId)));

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "User deleted successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
