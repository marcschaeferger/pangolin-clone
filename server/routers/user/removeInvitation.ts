import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { userInvites } from "@server/db";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { logAuditEvent } from "@server/lib/auditLogger";

const removeInvitationParamsSchema = z
    .object({
        orgId: z.string(),
        inviteId: z.string()
    })
    .strict();

export async function removeInvitation(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = removeInvitationParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId, inviteId } = parsedParams.data;

        const deletedInvitation = await db
            .delete(userInvites)
            .where(
                and(
                    eq(userInvites.orgId, orgId),
                    eq(userInvites.inviteId, inviteId)
                )
            )
            .returning();

        if (deletedInvitation.length === 0) {
            logAuditEvent("invite.delete", {
                userId: req.user?.userId,
                orgId,
                inviteId,
                success: false,
                error: "Invitation not found",
                ip: req.ip
            });
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Invitation with ID ${inviteId} not found in organization ${orgId}`
                )
            );
        }

        logAuditEvent("invite.delete", {
            userId: req.user?.userId,
            orgId,
            inviteId,
            targetEmail: deletedInvitation[0].email,
            success: true,
            ip: req.ip
        });

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Invitation removed successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        logAuditEvent("invite.delete", {
            userId: req.user?.userId,
            orgId: req.params.orgId,
            inviteId: req.params.inviteId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            ip: req.ip
        });
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
