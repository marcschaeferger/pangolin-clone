import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { userInvites } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { checkValidInvite } from "@server/auth/checkValidInvite";

const getInviteDetailsParamsSchema = z
    .object({
        inviteId: z.string(),
        token: z.string()
    })
    .strict();

export type GetInviteDetailsResponse = {
    email: string;
    orgId: string;
    expiresAt: number;
};

export async function getInviteDetails(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = getInviteDetailsParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { inviteId, token } = parsedParams.data;

        const { error, existingInvite } = await checkValidInvite({
            token,
            inviteId
        });

        if (error) {
            return next(createHttpError(HttpCode.BAD_REQUEST, error));
        }

        if (!existingInvite) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Invite does not exist")
            );
        }

        return response<GetInviteDetailsResponse>(res, {
            data: {
                email: existingInvite.email,
                orgId: existingInvite.orgId,
                expiresAt: existingInvite.expiresAt
            },
            success: true,
            error: false,
            message: "Invite details retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
} 