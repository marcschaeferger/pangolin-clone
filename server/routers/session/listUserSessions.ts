import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { db, sessions, users } from "@server/db";
import { eq, desc } from "drizzle-orm";
import logger from "@server/logger";

export type ListUserSessionsResponse = {
    sessions: Array<{
        sessionId: string;
        userId: string;
        username: string;
        email: string | null;
        expiresAt: number;
        createdAt: number;
    }>;
};

export async function listUserSessions(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    try {
        const result = await db
            .select({
                sessionId: sessions.sessionId,
                userId: sessions.userId,
                username: users.username,
                email: users.email,
                expiresAt: sessions.expiresAt,
            })
            .from(sessions)
            .innerJoin(users, eq(sessions.userId, users.userId))
            .orderBy(desc(sessions.expiresAt));

        const sessionsWithCreatedAt = result.map(session => ({
            ...session,
            createdAt: session.expiresAt - (1000 * 60 * 60 * 24), // Approximate creation time
        }));

        return response<ListUserSessionsResponse>(res, {
            data: { sessions: sessionsWithCreatedAt },
            success: true,
            error: false,
            message: "User sessions retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        logger.error("Failed to list user sessions", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to list user sessions",
            ),
        );
    }
}