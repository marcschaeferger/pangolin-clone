import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { users } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';


export async function getUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return next(createHttpError(HttpCode.UNAUTHORIZED, "User not found"));
        }

        // // Check if the user has permission to list sites
        // const hasPermission = await checkUserActionPermission(ActionsEnum.getUser, req);
        // if (!hasPermission) {
        //     return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
        // }

        const user = await db.select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (user.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `User with ID ${userId} not found`
                )
            );
        }

        return response(res, {
            data: {
                email: user[0].email,
                twoFactorEnabled: user[0].twoFactorEnabled,
                emailVerified: user[0].emailVerified
            },
            success: true,
            error: false,
            message: "User retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
