import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { invalidateSession as invalidateSessionAuth } from "@server/auth/sessions/app";
import logger from "@server/logger";

export const invalidateUserSessionParams = z.object({
    sessionId: z.string(),
}).strict();

export type InvalidateUserSessionParams = z.infer<typeof invalidateUserSessionParams>;

export type InvalidateUserSessionResponse = {
    success: boolean;
};

export async function invalidateUserSession(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedParams = invalidateUserSessionParams.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString(),
            ),
        );
    }

    const { sessionId } = parsedParams.data;

    // Note: Admins can invalidate any session, including their own
    // This is intentional as server admins should have full control

    try {
        await invalidateSessionAuth(sessionId);

        return response<InvalidateUserSessionResponse>(res, {
            data: { success: true },
            success: true,
            error: false,
            message: "User session invalidated successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        logger.error("Failed to invalidate user session", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to invalidate user session",
            ),
        );
    }
}