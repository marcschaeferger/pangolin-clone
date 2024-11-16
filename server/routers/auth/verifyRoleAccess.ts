import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { roles, userOrgs } from "@server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import logger from "@server/logger";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const verifyRoleAccessSchema = z.object({
    roleIds: z.array(z.number().int().positive()).optional(),
});

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

    const parsedBody = verifyRoleAccessSchema.safeParse(req.body);
    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { roleIds } = parsedBody.data;
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
