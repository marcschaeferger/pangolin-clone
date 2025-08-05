import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { invalidateAllSessions } from "@server/auth/sessions/app";
import logger from "@server/logger";

export const invalidateAllUserSessionsParams = z.object({
    userId: z.string(),
}).strict();

export type InvalidateAllUserSessionsParams = z.infer<typeof invalidateAllUserSessionsParams>;

export type InvalidateAllUserSessionsResponse = {
    success: boolean;
};

export async function invalidateAllUserSessions(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedParams = invalidateAllUserSessionsParams.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString(),
            ),
        );
    }

    const { userId } = parsedParams.data;

    // Note: Admins can invalidate any user's sessions, including their own
    // This is intentional as server admins should have full control

    try {
        await invalidateAllSessions(userId);

        return response<InvalidateAllUserSessionsResponse>(res, {
            data: { success: true },
            success: true,
            error: false,
            message: "All user sessions invalidated successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        logger.error("Failed to invalidate all user sessions", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to invalidate all user sessions",
            ),
        );
    }
}