import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { userOrgs } from "@server/db/schema";
import { and, eq, or } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";

export async function verifyUserAccess(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const userId = req.user!.userId;
    const reqUserId = req.params.userId || req.body.userId || req.query.userId;

    let userOrg = req.userOrg;

    if (!userId) {
        return next(
            createHttpError(HttpCode.UNAUTHORIZED, "User not authenticated")
        );
    }

    if (!reqUserId) {
        return next(createHttpError(HttpCode.BAD_REQUEST, "Invalid user ID"));
    }

    try {
        if (!userOrg) {
            const res = await db
                .select()
                .from(userOrgs)
                .where(
                    and(
                        eq(userOrgs.userId, reqUserId),
                        eq(userOrgs.orgId, req.userOrgId!)
                    )
                )
                .limit(1);
            userOrg = res[0];
        }

        if (userOrg) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have access to this user"
                )
            );
        }

        return next();
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Error checking if user has access to this user"
            )
        );
    }
}
