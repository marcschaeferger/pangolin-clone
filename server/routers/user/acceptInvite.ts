import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, userInvites, userOrgs, users } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { checkValidInvite } from "@server/auth/checkValidInvite";
import { verifySession } from "@server/auth/sessions/verifySession";
import { logAuditEvent } from "@server/lib/auditLogger";

const acceptInviteBodySchema = z
    .object({
        token: z.string(),
        inviteId: z.string()
    })
    .strict();

export type AcceptInviteResponse = {
    accepted: boolean;
    orgId: string;
};

export async function acceptInvite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = acceptInviteBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { token, inviteId } = parsedBody.data;

        const { error, existingInvite } = await checkValidInvite({
            token,
            inviteId
        });

        if (error) {
            logAuditEvent("invite.accept", {
                inviteId,
                success: false,
                error,
                ip: req.ip
            });
            return next(createHttpError(HttpCode.BAD_REQUEST, error));
        }

        if (!existingInvite) {
            logAuditEvent("invite.accept", {
                inviteId,
                success: false,
                error: "Invite does not exist",
                ip: req.ip
            });
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Invite does not exist")
            );
        }

        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, existingInvite.email))
            .limit(1);
        if (!existingUser.length) {
            logAuditEvent("invite.accept", {
                inviteId,
                targetEmail: existingInvite.email,
                success: false,
                error: "User does not exist",
                ip: req.ip
            });
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User does not exist. Please create an account first."
                )
            );
        }

        const { user } = await verifySession(req);

        // at this point we know the user exists
        if (!user) {
            logAuditEvent("invite.accept", {
                inviteId,
                targetEmail: existingInvite.email,
                success: false,
                error: "Not logged in",
                ip: req.ip
            });
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    "You must be logged in to accept an invite"
                )
            );
        }

        if (user && user.email !== existingInvite.email) {
            logAuditEvent("invite.accept", {
                userId: user.userId,
                inviteId,
                targetEmail: existingInvite.email,
                success: false,
                error: "Wrong user",
                ip: req.ip
            });
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invite is not for this user"
                )
            );
        }

        let roleId: number;
        // get the role to make sure it exists
        const existingRole = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, existingInvite.roleId))
            .limit(1);
        if (existingRole.length) {
            roleId = existingRole[0].roleId;
        } else {
            logAuditEvent("invite.accept", {
                userId: user.userId,
                inviteId,
                targetEmail: existingInvite.email,
                success: false,
                error: "Role does not exist",
                ip: req.ip
            });
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Role does not exist. Please contact an admin."
                )
            );
        }

        await db.transaction(async (trx) => {
            // add the user to the org
            await trx.insert(userOrgs).values({
                userId: existingUser[0].userId,
                orgId: existingInvite.orgId,
                roleId: existingInvite.roleId
            });

            // delete the invite
            await trx
                .delete(userInvites)
                .where(eq(userInvites.inviteId, inviteId));
        });

        logAuditEvent("invite.accept", {
            userId: user.userId,
            orgId: existingInvite.orgId,
            inviteId,
            targetEmail: existingInvite.email,
            roleId,
            success: true,
            ip: req.ip
        });

        return response<AcceptInviteResponse>(res, {
            data: { accepted: true, orgId: existingInvite.orgId },
            success: true,
            error: false,
            message: "Invite accepted",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        logAuditEvent("invite.accept", {
            inviteId: req.body.inviteId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            ip: req.ip
        });
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
