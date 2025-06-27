import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import createHttpError from "http-errors";
import { db } from "@server/db";
import { passwordResetTokens, users, orgs } from "@server/db";
import { eq, and } from "drizzle-orm";
import { alphabet, generateRandomString } from "oslo/crypto";
import { createDate, TimeSpan } from "oslo";
import { hashPassword } from "@server/auth/password";
import { sendEmail } from "@server/emails";
import ResetPasswordCode from "@server/emails/templates/ResetPasswordCode";
import config from "@server/lib/config";
import logger from "@server/logger";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import { OpenAPITags, registry } from "@server/openApi";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import { UserType } from "@server/types/UserTypes";

const adminResetUserPasswordParamsSchema = z
    .object({
        orgId: z.string(),
        userId: z.string()
    })
    .strict();

const adminResetUserPasswordBodySchema = z
    .object({
        sendEmail: z.boolean().optional().default(true)
    })
    .strict();

export type AdminResetUserPasswordBody = z.infer<typeof adminResetUserPasswordBodySchema>;
export type AdminResetUserPasswordResponse = {
    resetLink?: string;
    emailSent: boolean;
};

registry.registerPath({
    method: "post",
    path: "/org/{orgId}/user/{userId}/reset-password",
    description: "Generate a password reset link for a user (admin only).",
    tags: [OpenAPITags.User],
    request: {
        params: adminResetUserPasswordParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: adminResetUserPasswordBodySchema
                }
            }
        }
    },
    responses: {}
});

export async function adminResetUserPassword(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedParams = adminResetUserPasswordParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString()
            )
        );
    }

    const parsedBody = adminResetUserPasswordBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { orgId, userId } = parsedParams.data;
    const { sendEmail: shouldSendEmail } = parsedBody.data;

    // Check if the requesting user has permission to manage users in this org
    const hasPermission = await checkUserActionPermission(ActionsEnum.getOrgUser, req);

    if (!hasPermission) {
        return next(
            createHttpError(
                HttpCode.FORBIDDEN,
                "Insufficient permissions to reset user passwords"
            )
        );
    }

    try {
        // Get the organization settings
        const orgResult = await db
            .select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);

        if (!orgResult || !orgResult.length) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "Organization not found"
                )
            );
        }

        const org = orgResult[0];

        // Get the target user
        const targetUser = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!targetUser || !targetUser.length) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "User not found"
                )
            );
        }

        const user = targetUser[0];

        // Only allow resetting passwords for internal users
        if (user.type !== UserType.Internal) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Password reset is only available for internal users"
                )
            );
        }

        if (!user.email) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User does not have an email address"
                )
            );
        }

        // Generate reset token
        const token = generateRandomString(16, alphabet("0-9", "A-Z", "a-z"));
        const tokenHash = await hashPassword(token);

        // Use organization's password reset token expiry setting
        const expiryHours = org.passwordResetTokenExpiryHours || 1;

        // Store reset token in database
        await db.transaction(async (trx) => {
            // Delete any existing reset tokens for this user
            await trx
                .delete(passwordResetTokens)
                .where(eq(passwordResetTokens.userId, userId));

            // Insert new reset token
            await trx.insert(passwordResetTokens).values({
                userId: userId,
                email: user.email!,
                tokenHash,
                expiresAt: createDate(new TimeSpan(expiryHours, "h")).getTime()
            });
        });

        const resetUrl = `${config.getRawConfig().app.dashboard_url}/auth/reset-password?email=${encodeURIComponent(user.email!)}&token=${token}`;

        let emailSent = false;

        // Send email if requested
        if (shouldSendEmail) {
            try {
                await sendEmail(
                    ResetPasswordCode({
                        email: user.email!,
                        code: token,
                        link: resetUrl
                    }),
                    {
                        from: config.getNoReplyEmail(),
                        to: user.email!,
                        subject: "Password Reset - Initiated by Administrator"
                    }
                );
                emailSent = true;

                logger.info(
                    `Admin ${req.user!.userId} initiated password reset for user ${userId} in org ${orgId}. Email sent to ${user.email}. Token expires in ${expiryHours} hours.`
                );
            } catch (e) {
                logger.error("Failed to send admin-initiated password reset email", e);
                // Don't fail the request if email fails, just log it
            }
        } else {
            logger.info(
                `Admin ${req.user!.userId} generated password reset link for user ${userId} in org ${orgId}. No email sent. Token expires in ${expiryHours} hours.`
            );
        }

        return response<AdminResetUserPasswordResponse>(res, {
            data: {
                resetLink: resetUrl,
                emailSent
            },
            success: true,
            error: false,
            message: emailSent 
                ? `Password reset email sent to ${user.email}`
                : "Password reset link generated successfully",
            status: HttpCode.OK
        });

    } catch (e) {
        logger.error("Failed to generate admin password reset", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to generate password reset"
            )
        );
    }
} 