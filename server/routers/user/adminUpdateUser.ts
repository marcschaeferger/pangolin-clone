import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { users } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";

const updateUserBodySchema = z.object({
    name: z.string().min(1).max(255)
});

const updateUserParamsSchema = z.object({
    userId: z.string()
});

export async function adminUpdateUser(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = updateUserParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid user ID"
                )
            );
        }

        const parsedBody = updateUserBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid request body"
                )
            );
        }

        const { userId } = parsedParams.data;
        const { name } = parsedBody.data;

        // Check if requester is server admin
        if (!req.user?.serverAdmin) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "Only server admins can update user details"
                )
            );
        }

        // Check if the user exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        if (existingUser.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `User with ID ${userId} not found`
                )
            );
        }

        // Update user details
        await db
            .update(users)
            .set({
                name
            })
            .where(eq(users.userId, userId));

        return response(res, {
            data: { userId, name },
            success: true,
            error: false,
            message: "User updated successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
} 