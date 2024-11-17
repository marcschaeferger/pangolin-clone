import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import {
    resourceSessions,
    ResourceSession,
    User,
    users,
} from "@server/db/schema";
import db from "@server/db";
import { eq, and } from "drizzle-orm";

export const SESSION_COOKIE_NAME = "resource_session";
export const SESSION_COOKIE_EXPIRES = 1000 * 60 * 60 * 24 * 30;

export type ResourceAuthMethod = "password" | "pincode";

export async function createResourceSession(
    token: string,
    userId: string,
    resourceId: number,
    method: ResourceAuthMethod
): Promise<ResourceSession> {
    const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token))
    );
    const session: ResourceSession = {
        sessionId: sessionId,
        userId,
        expiresAt: new Date(Date.now() + SESSION_COOKIE_EXPIRES).getTime(),
        resourceId,
        method,
    };
    await db.insert(resourceSessions).values(session);
    return session;
}

export async function validateResourceSessionToken(
    token: string
): Promise<ResourceSessionValidationResult> {
    const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token))
    );
    const result = await db
        .select({ user: users, resourceSession: resourceSessions })
        .from(resourceSessions)
        .innerJoin(users, eq(resourceSessions.userId, users.userId))
        .where(eq(resourceSessions.sessionId, sessionId));
    if (result.length < 1) {
        return { session: null, user: null };
    }
    const { user, resourceSession } = result[0];
    if (Date.now() >= resourceSession.expiresAt) {
        await db
            .delete(resourceSessions)
            .where(eq(resourceSessions.sessionId, resourceSession.sessionId));
        return { session: null, user: null };
    }
    if (Date.now() >= resourceSession.expiresAt - SESSION_COOKIE_EXPIRES / 2) {
        resourceSession.expiresAt = new Date(
            Date.now() + SESSION_COOKIE_EXPIRES
        ).getTime();
        await db
            .update(resourceSessions)
            .set({
                expiresAt: resourceSession.expiresAt,
            })
            .where(eq(resourceSessions.sessionId, resourceSession.sessionId));
    }
    return { session: resourceSession, user };
}

export async function invalidateResourceSession(
    sessionId: string
): Promise<void> {
    await db
        .delete(resourceSessions)
        .where(eq(resourceSessions.sessionId, sessionId));
}

export async function invalidateAllSessions(
    userId: string,
    method?: ResourceAuthMethod
): Promise<void> {
    if (!method) {
        await db
            .delete(resourceSessions)
            .where(eq(resourceSessions.userId, userId));
    } else {
        await db
            .delete(resourceSessions)
            .where(
                and(
                    eq(resourceSessions.userId, userId),
                    eq(resourceSessions.method, method)
                )
            );
    }
}

export function serializeSessionCookie(
    token: string,
    fqdn: string,
    secure: boolean
): string {
    if (secure) {
        return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Max-Age=${SESSION_COOKIE_EXPIRES}; Path=/; Secure; Domain=${fqdn}`;
    } else {
        return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Max-Age=${SESSION_COOKIE_EXPIRES}; Path=/; Domain=${fqdn}`;
    }
}

export function createBlankSessionTokenCookie(
    fqdn: string,
    secure: boolean
): string {
    if (secure) {
        return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure; Domain=${fqdn}`;
    } else {
        return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Domain=${fqdn}`;
    }
}

export type ResourceSessionValidationResult =
    | { session: ResourceSession; user: User }
    | { session: null; user: null };
