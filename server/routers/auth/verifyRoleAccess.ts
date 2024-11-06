import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { roles, userOrgs } from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import logger from "@server/logger";

export async function verifyRoleAccess(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const userId = req.user?.userId;
    const roleId = parseInt(
        req.params.roleId || req.body.roleId || req.query.roleId
    );
    let userOrg = req.userOrg;

    if (!userId) {
        return next(
            createHttpError(HttpCode.UNAUTHORIZED, "User not authenticated")
        );
    }

    if (isNaN(roleId)) {
        return next(createHttpError(HttpCode.BAD_REQUEST, "Invalid role ID"));
    }

    try {
        const role = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, roleId))
            .limit(1);

        if (role.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Role with ID ${roleId} not found`
                )
            );
        }

        if (!userOrg) {
            const userOrgRole = await db
                .select()
                .from(userOrgs)
                .where(
                    and(
                        eq(userOrgs.userId, userId),
                        eq(userOrgs.orgId, role[0].orgId!)
                    )
                )
                .limit(1);
            userOrg = userOrgRole[0];
        }

        if (!userOrg) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have access to this organization"
                )
            );
        }

        req.userOrgRoleId = userOrg.roleId;
        req.userOrgId = userOrg.orgId;

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
