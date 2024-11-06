import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { userOrgs } from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";

export async function verifyOrgAccess(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const userId = req.user!.userId;
    const orgId = req.params.orgId;
    let userOrg = req.userOrg;

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

    try {
        if (!userOrg) {
            const userOrgRes = await db
                .select()
                .from(userOrgs)
                .where(
                    and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId))
                );
            userOrg = userOrgRes[0];
        }

        if (!userOrg) {
            next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have access to this organization"
                )
            );
        } else {
            // User has access, attach the user's role to the request for potential future use
            req.userOrgRoleId = userOrg.roleId;
            req.userOrgId = orgId;
            return next();
        }
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Error verifying organization access"
            )
        );
    }
}
