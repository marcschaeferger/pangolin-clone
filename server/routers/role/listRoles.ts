import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, orgs } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { sql, eq } from "drizzle-orm";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import stoi from "@server/lib/stoi";
import { OpenAPITags, registry } from "@server/openApi";

const listRolesParamsSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

const listRolesSchema = z.object({
    limit: z
        .string()
        .optional()
        .default("1000")
        .transform(Number)
        .pipe(z.number().int().nonnegative()),
    offset: z
        .string()
        .optional()
        .default("0")
        .transform(Number)
        .pipe(z.number().int().nonnegative())
});

async function queryRoles(orgId: string, limit: number, offset: number) {
    return await db
        .select({
            roleId: roles.roleId,
            orgId: roles.orgId,
            isAdmin: roles.isAdmin,
            name: roles.name,
            description: roles.description,
            orgName: orgs.name
        })
        .from(roles)
        .leftJoin(orgs, eq(roles.orgId, orgs.orgId))
        .where(eq(roles.orgId, orgId))
        .limit(limit)
        .offset(offset);
}

export type ListRolesResponse = {
    roles: NonNullable<Awaited<ReturnType<typeof queryRoles>>>;
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
};

registry.registerPath({
    method: "get",
    path: "/orgs/{orgId}/roles",
    description: "List roles.",
    tags: [OpenAPITags.Org, OpenAPITags.Role],
    request: {
        params: listRolesParamsSchema,
        query: listRolesSchema
    },
    responses: {}
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

        let countQuery: any = db
            .select({ count: sql<number>`cast(count(*) as integer)` })
            .from(roles)
            .where(eq(roles.orgId, orgId));

        const rolesList = await queryRoles(orgId, limit, offset);
        const totalCountResult = await countQuery;
        const totalCount = totalCountResult[0].count;

        return response(res, {
            data: {
                roles: rolesList,
                pagination: {
                    total: totalCount,
                    limit,
                    offset
                }
            },
            success: true,
            error: false,
            message: "Roles retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
