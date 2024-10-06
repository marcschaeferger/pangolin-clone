import { Request, Response, NextFunction } from "express";
import { lucia } from "@server/auth";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import logger from "@server/logger";

export async function logout(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const sessionId = req.cookies[lucia.sessionCookieName];

    if (!sessionId) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "You must be logged in to sign out",
            ),
        );
    }

    try {
        await lucia.invalidateSession(sessionId);
        res.setHeader(
            "Set-Cookie",
            lucia.createBlankSessionCookie().serialize(),
        );

        return response<null>(res, {
            data: null,
            success: true,
            error: false,
            message: "Logged out successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error("Failed to log out", error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to log out",
            ),
        );
    }
}
