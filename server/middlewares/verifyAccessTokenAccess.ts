import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { resourceAccessToken, resources, userOrgs } from "@server/db";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { canUserAccessResource } from "@server/auth/canUserAccessResource";

export async function verifyAccessTokenAccess(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const userId = req.user!.userId;
    const accessTokenId = req.params.accessTokenId;

    if (!userId) {
        return next(
            createHttpError(HttpCode.UNAUTHORIZED, "User not authenticated")
        );
    }

    const [accessToken] = await db
        .select()
        .from(resourceAccessToken)
        .where(eq(resourceAccessToken.accessTokenId, accessTokenId))
        .limit(1);

    if (!accessToken) {
        return next(
            createHttpError(
                HttpCode.NOT_FOUND,
                `Access token with ID ${accessTokenId} not found`
            )
        );
    }

    const resourceId = accessToken.resourceId;

    if (!resourceId) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                `Access token with ID ${accessTokenId} does not have a resource ID`
            )
        );
    }

    try {
        const resource = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId!))
            .limit(1);

        if (resource.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        if (!resource[0].orgId) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    `Resource with ID ${resourceId} does not have an organization ID`
                )
            );
        }

        if (!req.userOrg) {
            const res = await db
                .select()
                .from(userOrgs)
                .where(
                    and(
                        eq(userOrgs.userId, userId),
                        eq(userOrgs.orgId, resource[0].orgId)
                    )
                );
            req.userOrg = res[0];
        }

        if (!req.userOrg) {
            next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have access to this organization"
                )
            );
        } else {
            req.userOrgRoleId = req.userOrg.roleId;
            req.userOrgId = resource[0].orgId!;
        }

        const resourceAllowed = await canUserAccessResource({
            userId,
            resourceId,
            roleId: req.userOrgRoleId!
        });

        if (!resourceAllowed) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have access to this resource"
                )
            );
        }

        next();
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Error verifying organization access"
            )
        );
    }
}
