import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { invalidateResourceSession as invalidateResourceSessionAuth } from "@server/auth/sessions/resource";
import logger from "@server/logger";

export const invalidateResourceSessionParams = z.object({
    sessionId: z.string(),
}).strict();

export type InvalidateResourceSessionParams = z.infer<typeof invalidateResourceSessionParams>;

export type InvalidateResourceSessionResponse = {
    success: boolean;
};

export async function invalidateResourceSession(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedParams = invalidateResourceSessionParams.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString(),
            ),
        );
    }

    const { sessionId } = parsedParams.data;

    try {
        await invalidateResourceSessionAuth(sessionId);

        return response<InvalidateResourceSessionResponse>(res, {
            data: { success: true },
            success: true,
            error: false,
            message: "Resource session invalidated successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        logger.error("Failed to invalidate resource session", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to invalidate resource session",
            ),
        );
    }
}