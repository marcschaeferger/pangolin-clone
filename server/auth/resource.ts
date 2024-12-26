import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import {
    resourceSessions,
    ResourceSession,
    resources
} from "@server/db/schema";
import db from "@server/db";
import { eq, and } from "drizzle-orm";
import config from "@server/config";

export const SESSION_COOKIE_NAME = "resource_session";
export const SESSION_COOKIE_EXPIRES = 1000 * 60 * 60 * 24 * 30;
export const SECURE_COOKIES = config.server.secure_cookies;
export const COOKIE_DOMAIN =
    "." + new URL(config.app.base_url).hostname.split(".").slice(-2).join(".");

export async function createResourceSession(opts: {
    token: string;
    resourceId: number;
    passwordId?: number;
    pincodeId?: number;
    whitelistId?: number;
    accessTokenId?: string;
    usedOtp?: boolean;
    doNotExtend?: boolean;
    expiresAt?: number | null;
    sessionLength?: number | null;
}): Promise<ResourceSession> {
    if (
        !opts.passwordId &&
        !opts.pincodeId &&
        !opts.whitelistId &&
        !opts.accessTokenId
    ) {
        throw new Error("Auth method must be provided");
    }

    const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(opts.token))
    );

    const session: ResourceSession = {
        sessionId: sessionId,
        expiresAt:
            opts.expiresAt ||
            new Date(Date.now() + SESSION_COOKIE_EXPIRES).getTime(),
        sessionLength: opts.sessionLength || SESSION_COOKIE_EXPIRES,
        resourceId: opts.resourceId,
        passwordId: opts.passwordId || null,
        pincodeId: opts.pincodeId || null,
        whitelistId: opts.whitelistId || null,
        doNotExtend: opts.doNotExtend || false,
        accessTokenId: opts.accessTokenId || null
    };

    await db.insert(resourceSessions).values(session);

    return session;
}

export async function validateResourceSessionToken(
    token: string,
    resourceId: number
): Promise<ResourceSessionValidationResult> {
    const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token))
    );
    const result = await db
        .select()
        .from(resourceSessions)
        .where(
            and(
                eq(resourceSessions.sessionId, sessionId),
                eq(resourceSessions.resourceId, resourceId)
            )
        );

    if (result.length < 1) {
        return { resourceSession: null };
    }

    const resourceSession = result[0];

    if (Date.now() >= resourceSession.expiresAt) {
        await db
            .delete(resourceSessions)
            .where(eq(resourceSessions.sessionId, resourceSessions.sessionId));
        return { resourceSession: null };
    } else if (
        Date.now() >=
            resourceSession.expiresAt - resourceSession.sessionLength / 2
    ) {
        if (!resourceSession.doNotExtend) {
            resourceSession.expiresAt = new Date(
                Date.now() + resourceSession.sessionLength
            ).getTime();
            await db
            .update(resourceSessions)
            .set({
                expiresAt: resourceSession.expiresAt
            })
            .where(eq(resourceSessions.sessionId, resourceSession.sessionId));
        }
    }

    return { resourceSession };
}

export async function invalidateResourceSession(
    sessionId: string
): Promise<void> {
    await db
        .delete(resourceSessions)
        .where(eq(resourceSessions.sessionId, sessionId));
}

export async function invalidateAllSessions(
    resourceId: number,
    method?: {
        passwordId?: number;
        pincodeId?: number;
        whitelistId?: number;
    }
): Promise<void> {
    if (method?.passwordId) {
        await db
            .delete(resourceSessions)
            .where(
                and(
                    eq(resourceSessions.resourceId, resourceId),
                    eq(resourceSessions.passwordId, method.passwordId)
                )
            );
    }

    if (method?.pincodeId) {
        await db
            .delete(resourceSessions)
            .where(
                and(
                    eq(resourceSessions.resourceId, resourceId),
                    eq(resourceSessions.pincodeId, method.pincodeId)
                )
            );
    }

    if (method?.whitelistId) {
        await db
            .delete(resourceSessions)
            .where(
                and(
                    eq(resourceSessions.resourceId, resourceId),
                    eq(resourceSessions.whitelistId, method.whitelistId)
                )
            );
    }
    if (!method?.passwordId && !method?.pincodeId && !method?.whitelistId) {
        await db
            .delete(resourceSessions)
            .where(eq(resourceSessions.resourceId, resourceId));
    }
}

export function serializeResourceSessionCookie(
    cookieName: string,
    token: string
): string {
    if (SECURE_COOKIES) {
        return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_COOKIE_EXPIRES}; Path=/; Secure; Domain=${COOKIE_DOMAIN}`;
    } else {
        return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_COOKIE_EXPIRES}; Path=/; Domain=${COOKIE_DOMAIN}`;
    }
}

export function createBlankResourceSessionTokenCookie(
    cookieName: string
): string {
    if (SECURE_COOKIES) {
        return `${cookieName}=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/; Secure; Domain=${COOKIE_DOMAIN}`;
    } else {
        return `${cookieName}=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/; Domain=${COOKIE_DOMAIN}`;
    }
}

export type ResourceSessionValidationResult = {
    resourceSession: ResourceSession | null;
};
