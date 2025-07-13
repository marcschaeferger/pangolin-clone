import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { users, userOrgs } from "@server/db";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import { OpenAPITags, registry } from "@server/openApi";

const updateUser2FAParamsSchema = z
    .object({
        userId: z.string(),
        orgId: z.string()
    })
    .strict();

const updateUser2FABodySchema = z
    .object({
        twoFactorEnabled: z.boolean()
    })
    .strict();

export type UpdateUser2FAResponse = {
    userId: string;
    twoFactorEnabled: boolean;
};

registry.registerPath({
    method: "patch",
    path: "/org/{orgId}/user/{userId}/2fa",
    description: "Update a user's 2FA status within an organization.",
    tags: [OpenAPITags.Org, OpenAPITags.User],
    request: {
        params: updateUser2FAParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: updateUser2FABodySchema
                }
            }
        }
    },
    responses: {}
});

export async function updateUser2FA(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = updateUser2FAParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = updateUser2FABodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { userId, orgId } = parsedParams.data;
        const { twoFactorEnabled } = parsedBody.data;

        if (!req.userOrg) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "You do not have access to this organization"
                )
            );
        }

        // Check if user has permission to update other users' 2FA
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.getOrgUser,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission to update other users' 2FA settings"
                )
            );
        }

        // Verify the user exists in the organization
        const existingUser = await db
            .select()
            .from(userOrgs)
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId)))
            .limit(1);

        if (existingUser.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "User not found or does not belong to the specified organization"
                )
            );
        }

        // Update the user's 2FA status
        const updatedUser = await db
            .update(users)
            .set({ 
                twoFactorEnabled,
                // If disabling 2FA, also clear the secret
                twoFactorSecret: twoFactorEnabled ? undefined : null
            })
            .where(eq(users.userId, userId))
            .returning({ userId: users.userId, twoFactorEnabled: users.twoFactorEnabled });

        if (updatedUser.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "User not found"
                )
            );
        }

        return response<UpdateUser2FAResponse>(res, {
            data: updatedUser[0],
            success: true,
            error: false,
            message: `2FA ${twoFactorEnabled ? 'enabled' : 'disabled'} for user successfully`,
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}