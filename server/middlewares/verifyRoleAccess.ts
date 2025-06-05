import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { roles, userOrgs } from "@server/db";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import logger from "@server/logger";

export async function verifyRoleAccess(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const userId = req.user?.userId;
    const singleRoleId = parseInt(
        req.params.roleId || req.body.roleId || req.query.roleId
    );

    if (!userId) {
        return next(
            createHttpError(HttpCode.UNAUTHORIZED, "User not authenticated")
        );
    }

    const { roleIds } = req.body;
    const allRoleIds = roleIds || (isNaN(singleRoleId) ? [] : [singleRoleId]);

    if (allRoleIds.length === 0) {
        return next();
    }

    try {
        const rolesData = await db
            .select()
            .from(roles)
            .where(inArray(roles.roleId, allRoleIds));

        if (rolesData.length !== allRoleIds.length) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "One or more roles not found"
                )
            );
        }

        const orgIds = new Set(rolesData.map((role) => role.orgId));

        // Check user access to each role's organization
        for (const role of rolesData) {
            const userOrgRole = await db
                .select()
                .from(userOrgs)
                .where(
                    and(
                        eq(userOrgs.userId, userId),
                        eq(userOrgs.orgId, role.orgId!)
                    )
                )
                .limit(1);

            if (userOrgRole.length === 0) {
                return next(
                    createHttpError(
                        HttpCode.FORBIDDEN,
                        `User does not have access to organization for role ID ${role.roleId}`
                    )
                );
            }

            req.userOrgId = role.orgId;
        }

        if (orgIds.size > 1) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "Roles must belong to the same organization"
                )
            );
        }

        const orgId = orgIds.values().next().value;

        if (!orgId) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Organization ID not found"
                )
            );
        }

        if (!req.userOrg) {
            // get the userORg
            const userOrg = await db
                .select()
                .from(userOrgs)
                .where(
                    and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId!))
                )
                .limit(1);

            req.userOrg = userOrg[0];
            req.userOrgRoleId = userOrg[0].roleId;
        }

        return next();
    } catch (error) {
        logger.error("Error verifying role access:", error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Error verifying role access"
            )
        );
    }
}

