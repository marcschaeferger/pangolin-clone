import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { db, sessions, resourceSessions } from "@server/db";
import { count, lt } from "drizzle-orm";
import logger from "@server/logger";

export type GetSessionStatsResponse = {
    stats: {
        totalUserSessions: number;
        totalResourceSessions: number;
        userSessionsExpiringSoon: number;
        resourceSessionsExpiringSoon: number;
    };
};

export async function getSessionStats(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    try {
        const now = Date.now();
        const oneHourFromNow = now + (60 * 60 * 1000); // 1 hour in milliseconds

        // Get user session counts
        const [userSessionsResult] = await db
            .select({ count: count() })
            .from(sessions);

        const [userSessionsExpiringSoonResult] = await db
            .select({ count: count() })
            .from(sessions)
            .where(lt(sessions.expiresAt, oneHourFromNow));

        // Get resource session counts
        const [resourceSessionsResult] = await db
            .select({ count: count() })
            .from(resourceSessions);

        const [resourceSessionsExpiringSoonResult] = await db
            .select({ count: count() })
            .from(resourceSessions)
            .where(lt(resourceSessions.expiresAt, oneHourFromNow));

        const stats = {
            totalUserSessions: userSessionsResult?.count || 0,
            totalResourceSessions: resourceSessionsResult?.count || 0,
            userSessionsExpiringSoon: userSessionsExpiringSoonResult?.count || 0,
            resourceSessionsExpiringSoon: resourceSessionsExpiringSoonResult?.count || 0,
        };

        return response<GetSessionStatsResponse>(res, {
            data: { stats },
            success: true,
            error: false,
            message: "Session statistics retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        logger.error("Failed to get session statistics", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to get session statistics",
            ),
        );
    }
}