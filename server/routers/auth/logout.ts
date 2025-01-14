import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import response from "@server/lib/response";
import logger from "@server/logger";
import {
    createBlankSessionTokenCookie,
    invalidateSession,
    SESSION_COOKIE_NAME
} from "@server/auth/sessions/app";

export async function logout(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "You must be logged in to sign out"
            )
        );
    }

    try {
        await invalidateSession(sessionId);
        const isSecure = req.protocol === "https";
        res.setHeader("Set-Cookie", createBlankSessionTokenCookie(isSecure));

        return response<null>(res, {
            data: null,
            success: true,
            error: false,
            message: "Logged out successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "Failed to log out")
        );
    }
}
