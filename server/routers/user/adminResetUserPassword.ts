import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import createHttpError from "http-errors";
import { db } from "@server/db";
import { passwordResetTokens, users } from "@server/db";
import { eq } from "drizzle-orm";
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
import { UserType } from "@server/types/UserTypes";

const adminResetUserPasswordParamsSchema = z
    .object({
        userId: z.string()
    })
    .strict();

const adminResetUserPasswordBodySchema = z
    .object({
        sendEmail: z.boolean().optional().default(true),
        expirationHours: z.number().int().positive().optional().default(24)
    })
    .strict();

export type AdminResetUserPasswordBody = z.infer<typeof adminResetUserPasswordBodySchema>;
export type AdminResetUserPasswordResponse = {
    resetLink?: string;
    emailSent: boolean;
};

registry.registerPath({
    method: "post",
    path: "/admin/user/{userId}/password",
    description: "Generate a password reset link for a user (server admin only).",
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

    const { userId } = parsedParams.data;
    const { sendEmail: shouldSendEmail, expirationHours } = parsedBody.data;

    try {
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
                expiresAt: createDate(new TimeSpan(expirationHours, "h")).getTime()
            });
        });

        const resetUrl = `${config.getRawConfig().app.dashboard_url}/auth/reset-password?email=${encodeURIComponent(user.email!)}&token=${token}`;

        let emailSent = false;

        // Get the admin identifier (either user ID or API key ID)
        const adminId = req.user?.userId || req.apiKey?.apiKeyId || 'unknown';

        // Send email if requested
        if (shouldSendEmail) {
            // Check if email is configured
            if (!config.getRawConfig().email) {
                logger.info(
                    `Server admin ${adminId} generated password reset link for user ${userId}. Email not configured, no email sent. Token expires in ${expirationHours} hours.`
                );
                emailSent = false;
            } else {
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
                            subject: "Password Reset - Initiated by Server Administrator"
                        }
                    );
                    emailSent = true;

                    logger.info(
                        `Server admin ${adminId} initiated password reset for user ${userId}. Email sent to ${user.email}. Token expires in ${expirationHours} hours.`
                    );
                } catch (e) {
                    logger.error("Failed to send server admin-initiated password reset email", e);
                    // Don't fail the request if email fails, just log it
                    emailSent = false;
                }
            }
        } else {
            logger.info(
                `Server admin ${adminId} generated password reset link for user ${userId}. No email sent. Token expires in ${expirationHours} hours.`
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
        logger.error("Failed to generate server admin password reset", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to generate password reset"
            )
        );
    }
} 