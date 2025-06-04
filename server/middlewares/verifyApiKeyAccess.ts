import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { userOrgs, apiKeys, apiKeyOrg } from "@server/db";
import { and, eq, or } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";

export async function verifyApiKeyAccess(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user!.userId;
        const apiKeyId =
            req.params.apiKeyId || req.body.apiKeyId || req.query.apiKeyId;
        const orgId = req.params.orgId;

        if (!userId) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "User not authenticated")
            );
        }

        if (!orgId) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Invalid organization ID")
            );
        }

        if (!apiKeyId) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Invalid key ID")
            );
        }

        const [apiKey] = await db
            .select()
            .from(apiKeys)
            .innerJoin(apiKeyOrg, eq(apiKeys.apiKeyId, apiKeyOrg.apiKeyId))
            .where(
                and(eq(apiKeys.apiKeyId, apiKeyId), eq(apiKeyOrg.orgId, orgId))
            )
            .limit(1);

        if (!apiKey.apiKeys) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `API key with ID ${apiKeyId} not found`
                )
            );
        }

        if (!apiKeyOrg.orgId) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    `API key with ID ${apiKeyId} does not have an organization ID`
                )
            );
        }

        if (!req.userOrg) {
            const userOrgRole = await db
                .select()
                .from(userOrgs)
                .where(
                    and(
                        eq(userOrgs.userId, userId),
                        eq(userOrgs.orgId, apiKeyOrg.orgId)
                    )
                )
                .limit(1);
            req.userOrg = userOrgRole[0];
        }

        if (!req.userOrg) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have access to this organization"
                )
            );
        }

        const userOrgRoleId = req.userOrg.roleId;
        req.userOrgRoleId = userOrgRoleId;

        return next();
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Error verifying key access"
            )
        );
    }
}
