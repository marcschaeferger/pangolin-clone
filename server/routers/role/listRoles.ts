import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, orgs } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { sql, eq } from "drizzle-orm";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const listRolesParamsSchema = z.object({
    orgId: z.string(),
});

const listRolesSchema = z.object({
    limit: z
        .string()
        .optional()
        .transform(Number)
        .pipe(z.number().int().positive().default(10)),
    offset: z
        .string()
        .optional()
        .transform(Number)
        .pipe(z.number().int().nonnegative().default(0)),
    orgId: z
        .string()
        .optional()
        .transform(Number)
        .pipe(z.number().int().positive()),
});

export async function listRoles(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = listRolesSchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedQuery.error).toString()
                )
            );
        }

        const { limit, offset } = parsedQuery.data;

        const parsedParams = listRolesParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId } = parsedParams.data;

        // Check if the user has permission to list roles
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.listRoles,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission to perform this action"
                )
            );
        }

        let baseQuery: any = db
            .select({
                roleId: roles.roleId,
                orgId: roles.orgId,
                isAdmin: roles.isAdmin,
                name: roles.name,
                description: roles.description,
                orgName: orgs.name,
            })
            .from(roles)
            .leftJoin(orgs, eq(roles.orgId, orgs.orgId))
            .where(eq(roles.orgId, orgId));

        let countQuery: any = db
            .select({ count: sql<number>`cast(count(*) as integer)` })
            .from(roles)
            .where(eq(roles.orgId, orgId));

        const rolesList = await baseQuery.limit(limit).offset(offset);
        const totalCountResult = await countQuery;
        const totalCount = totalCountResult[0].count;

        return response(res, {
            data: {
                roles: rolesList,
                pagination: {
                    total: totalCount,
                    limit,
                    offset,
                },
            },
            success: true,
            error: false,
            message: "Roles retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
}
