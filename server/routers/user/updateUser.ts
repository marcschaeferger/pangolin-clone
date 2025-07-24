import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { users } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";

const updateUserParamsSchema = z
    .object({
        orgId: z.string(),
        userId: z.string()
    })
    .strict();

const updateUserBodySchema = z
    .object({
        email: z.string().email().optional()
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    });

export type UpdateUserResponse = {
    userId: string;
    email: string | null;
    username: string;
};

registry.registerPath({
    method: "post",
    path: "/org/{orgId}/user/{userId}",
    description: "Update a user's details (name, email).",
    tags: [OpenAPITags.User],
    request: {
        params: updateUserParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: updateUserBodySchema
                }
            }
        }
    },
    responses: {}
});

export async function updateUser(
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
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = updateUserBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { orgId, userId } = parsedParams.data;
        const updateData = parsedBody.data;

        // Check if user has permission to update users
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.getOrgUser,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission to update user details"
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

        // Prevent updating server admin details unless requester is also server admin
        if (existingUser[0].serverAdmin && !req.user?.serverAdmin) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "Cannot update server admin details"
                )
            );
        }

        // Update the user
        const updatedUser = await db
            .update(users)
            .set(updateData)
            .where(eq(users.userId, userId))
            .returning({
                userId: users.userId,
                email: users.email,
                username: users.username
            });

        if (updatedUser.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `User with ID ${userId} not found`
                )
            );
        }

        return response<UpdateUserResponse>(res, {
            data: updatedUser[0],
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