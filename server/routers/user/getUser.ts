import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";

export type GetUserResponse = {
    email: string;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
};

export async function getUser(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "User not found"),
            );
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (user.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `User with ID ${userId} not found`,
                ),
            );
        }

        return response<GetUserResponse>(res, {
            data: {
                email: user[0].email,
                twoFactorEnabled: user[0].twoFactorEnabled,
                emailVerified: user[0].emailVerified,
            },
            success: true,
            error: false,
            message: "User retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred...",
            ),
        );
    }
}
