import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import {
    IdpSession,
    idpSessions,
    IdpUser,
    idpUser,
    resourceSessions
} from "@server/db/schemas";
import db from "@server/db";
import { eq } from "drizzle-orm";
import logger from "@server/logger";
import config from "@server/lib/config";
import cookie from "cookie";

const SESSION_COOKIE_EXPIRES =
    1000 *
    60 *
    60 *
    config.getRawConfig().server.dashboard_session_length_hours;
const COOKIE_DOMAIN =
    "." + new URL(config.getRawConfig().app.dashboard_url).hostname;

export async function createIdpSession(
    token: string,
    idpUserId: string
): Promise<IdpSession> {
    const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token))
    );
    const session: IdpSession = {
        idpSessionId: sessionId,
        idpUserId,
        expiresAt: new Date(Date.now() + SESSION_COOKIE_EXPIRES).getTime()
    };
    await db.insert(idpSessions).values(session);
    return session;
}

export async function validateIdpSessionToken(
    token: string
): Promise<IdpSessionValidationResult> {
    const idpSessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token))
    );
    const result = await db
        .select({ idpUser: idpUser, idpSession: idpSessions })
        .from(idpSessions)
        .innerJoin(idpUser, eq(idpSessions.idpUserId, idpUser.idpUserId))
        .where(eq(idpSessions.idpSessionId, idpSessionId));
    if (result.length < 1) {
        return { session: null, user: null };
    }
    const { idpUser: idpUserRes, idpSession: idpSessionRes } = result[0];
    if (Date.now() >= idpSessionRes.expiresAt) {
        await db
            .delete(idpSessions)
            .where(eq(idpSessions.idpSessionId, idpSessionRes.idpSessionId));
        return { session: null, user: null };
    }
    if (Date.now() >= idpSessionRes.expiresAt - SESSION_COOKIE_EXPIRES / 2) {
        idpSessionRes.expiresAt = new Date(
            Date.now() + SESSION_COOKIE_EXPIRES
        ).getTime();
        await db.transaction(async (trx) => {
            await trx
                .update(idpSessions)
                .set({
                    expiresAt: idpSessionRes.expiresAt
                })
                .where(
                    eq(idpSessions.idpSessionId, idpSessionRes.idpSessionId)
                );

            await trx
                .update(resourceSessions)
                .set({
                    expiresAt: idpSessionRes.expiresAt
                })
                .where(
                    eq(
                        resourceSessions.idpSessionId,
                        idpSessionRes.idpSessionId
                    )
                );
        });
    }
    return { session: idpSessionRes, user: idpUserRes };
}

export async function invalidateIdpSession(
    idpSessionId: string
): Promise<void> {
    try {
        await db.transaction(async (trx) => {
            await trx
                .delete(resourceSessions)
                .where(eq(resourceSessions.idpSessionId, idpSessionId));
            await trx
                .delete(idpSessions)
                .where(eq(idpSessions.idpSessionId, idpSessionId));
        });
    } catch (e) {
        logger.error("Failed to invalidate session", e);
    }
}

export function serializeIdpSessionCookie(
    cookieName: string,
    token: string,
    isSecure: boolean,
    expiresAt: Date
): string {
    return cookie.serialize(cookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
        secure: isSecure,
        domain: COOKIE_DOMAIN
    });
}

export type IdpSessionValidationResult =
    | { session: IdpSession; user: IdpUser }
    | { session: null; user: null };
