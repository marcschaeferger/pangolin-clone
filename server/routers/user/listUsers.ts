import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, userOrgs, users } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { sql } from "drizzle-orm";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";

const listUsersParamsSchema = z.object({
    orgId: z.string(),
});

const listUsersSchema = z.object({
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
        .pipe(z.number().int().nonnegative()),
});

async function queryUsers(orgId: string, limit: number, offset: number) {
    return await db
        .select({
            id: users.userId,
            email: users.email,
            emailVerified: users.emailVerified,
            dateCreated: users.dateCreated,
            orgId: userOrgs.orgId,
            roleId: userOrgs.roleId,
            roleName: roles.name,
        })
        .from(users)
        .leftJoin(userOrgs, sql`${users.userId} = ${userOrgs.userId}`)
        .leftJoin(roles, sql`${userOrgs.roleId} = ${roles.roleId}`)
        .where(sql`${userOrgs.orgId} = ${orgId}`)
        .limit(limit)
        .offset(offset);
}

export type ListUsersResponse = {
    users: NonNullable<Awaited<ReturnType<typeof queryUsers>>>;
    pagination: { total: number; limit: number; offset: number };
};

export async function listUsers(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = listUsersSchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedQuery.error.errors.map((e) => e.message).join(", ")
                )
            );
        }
        const { limit, offset } = parsedQuery.data;

        const parsedParams = listUsersParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map((e) => e.message).join(", ")
                )
            );
        }

        const { orgId } = parsedParams.data;

        // Check if the user has permission to list users
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.listUsers,
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

        const usersWithRoles = await queryUsers(
            orgId.toString(),
            limit,
            offset
        );

        // Count total users
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users);

        return response<ListUsersResponse>(res, {
            data: {
                users: usersWithRoles,
                pagination: {
                    total: count,
                    limit,
                    offset,
                },
            },
            success: true,
            error: false,
            message: "Users retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
