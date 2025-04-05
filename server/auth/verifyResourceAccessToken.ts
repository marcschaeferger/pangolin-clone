import db from "@server/db";
import {
    Resource,
    ResourceAccessToken,
    resourceAccessToken,
    resources
} from "@server/db/schemas";
import { and, eq } from "drizzle-orm";
import { isWithinExpirationDate } from "oslo";
import { verifyPassword } from "./password";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

export async function verifyResourceAccessTokenSHA256({
    accessToken
}: {
    accessToken: string;
}): Promise<{
    valid: boolean;
    error?: string;
    tokenItem?: ResourceAccessToken;
    resource?: Resource;
}> {
    const accessTokenHash = encodeHexLowerCase(
        sha256(new TextEncoder().encode(accessToken))
    );

    const [res] = await db
        .select()
        .from(resourceAccessToken)
        .where(and(eq(resourceAccessToken.tokenHash, accessTokenHash)))
        .innerJoin(
            resources,
            eq(resourceAccessToken.resourceId, resources.resourceId)
        );

    const tokenItem = res?.resourceAccessToken;
    const resource = res?.resources;

    if (!tokenItem || !resource) {
        return {
            valid: false,
            error: "Access token does not exist for resource"
        };
    }

    if (
        tokenItem.expiresAt &&
        !isWithinExpirationDate(new Date(tokenItem.expiresAt))
    ) {
        return {
            valid: false,
            error: "Access token has expired"
        };
    }

    return {
        valid: true,
        tokenItem,
        resource
    };
}

export async function verifyResourceAccessToken({
    resource,
    accessTokenId,
    accessToken
}: {
    resource: Resource;
    accessTokenId: string;
    accessToken: string;
}): Promise<{
    valid: boolean;
    error?: string;
    tokenItem?: ResourceAccessToken;
}> {
    const [result] = await db
        .select()
        .from(resourceAccessToken)
        .where(
            and(
                eq(resourceAccessToken.resourceId, resource.resourceId),
                eq(resourceAccessToken.accessTokenId, accessTokenId)
            )
        )
        .limit(1);

    const tokenItem = result;

    if (!tokenItem) {
        return {
            valid: false,
            error: "Access token does not exist for resource"
        };
    }

    const validCode = await verifyPassword(accessToken, tokenItem.tokenHash);

    if (!validCode) {
        return {
            valid: false,
            error: "Invalid access token"
        };
    }

    if (
        tokenItem.expiresAt &&
        !isWithinExpirationDate(new Date(tokenItem.expiresAt))
    ) {
        return {
            valid: false,
            error: "Access token has expired"
        };
    }

    return {
        valid: true,
        tokenItem
    };
}
