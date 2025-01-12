import db from "@server/db";
import {
    Resource,
    ResourceAccessToken,
    resourceAccessToken,
} from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import { isWithinExpirationDate } from "oslo";
import { verifyPassword } from "./password";

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
