import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { db, resourceSessions, resources, users, sessions } from "@server/db";
import { eq, desc } from "drizzle-orm";
import logger from "@server/logger";

export type ListResourceSessionsResponse = {
    sessions: Array<{
        sessionId: string;
        resourceId: number;
        resourceName: string;
        expiresAt: number;
        sessionLength: number;
        doNotExtend: boolean;
        isRequestToken: boolean;
        userSessionId: string | null;
        username: string | null;
        email: string | null;
        authMethod: string;
    }>;
};

export async function listResourceSessions(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    try {
        const result = await db
            .select({
                sessionId: resourceSessions.sessionId,
                resourceId: resourceSessions.resourceId,
                resourceName: resources.name,
                expiresAt: resourceSessions.expiresAt,
                sessionLength: resourceSessions.sessionLength,
                doNotExtend: resourceSessions.doNotExtend,
                isRequestToken: resourceSessions.isRequestToken,
                userSessionId: resourceSessions.userSessionId,
                username: users.username,
                email: users.email,
                passwordId: resourceSessions.passwordId,
                pincodeId: resourceSessions.pincodeId,
                whitelistId: resourceSessions.whitelistId,
                accessTokenId: resourceSessions.accessTokenId,
            })
            .from(resourceSessions)
            .innerJoin(resources, eq(resourceSessions.resourceId, resources.resourceId))
            .leftJoin(sessions, eq(resourceSessions.userSessionId, sessions.sessionId))
            .leftJoin(users, eq(sessions.userId, users.userId))
            .orderBy(desc(resourceSessions.expiresAt));

        const sessionsWithAuthMethod = result.map(session => ({
            sessionId: session.sessionId,
            resourceId: session.resourceId,
            resourceName: session.resourceName,
            expiresAt: session.expiresAt,
            sessionLength: session.sessionLength,
            doNotExtend: session.doNotExtend,
            isRequestToken: session.isRequestToken || false,
            userSessionId: session.userSessionId,
            username: session.username,
            email: session.email,
            authMethod: session.passwordId ? "Password" :
                       session.pincodeId ? "Pincode" :
                       session.whitelistId ? "Whitelist" :
                       session.accessTokenId ? "Access Token" :
                       session.userSessionId ? "User Session" : "Unknown",
        }));

        return response<ListResourceSessionsResponse>(res, {
            data: { sessions: sessionsWithAuthMethod },
            success: true,
            error: false,
            message: "Resource sessions retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        logger.error("Failed to list resource sessions", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to list resource sessions",
            ),
        );
    }
}