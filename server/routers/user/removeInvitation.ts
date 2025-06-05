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
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Invitation with ID ${inviteId} not found in organization ${orgId}`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Invitation removed successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
