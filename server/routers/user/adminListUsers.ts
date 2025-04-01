import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { sql, eq } from "drizzle-orm";
import logger from "@server/logger";
import { users } from "@server/db/schemas";
import { fromZodError } from "zod-validation-error";

const listUsersSchema = z
    .object({
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
    })
    .strict();

async function queryUsers(limit: number, offset: number) {
    return await db
        .select({
            id: users.userId,
            email: users.email,
            dateCreated: users.dateCreated,
            serverAdmin: users.serverAdmin
        })
        .from(users)
        .where(eq(users.serverAdmin, false))
        .limit(limit)
        .offset(offset);
}

export type AdminListUsersResponse = {
    users: NonNullable<Awaited<ReturnType<typeof queryUsers>>>;
    pagination: { total: number; limit: number; offset: number };
};

export async function adminListUsers(
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
                    fromZodError(parsedQuery.error)
                )
            );
        }
        const { limit, offset } = parsedQuery.data;

        const allUsers = await queryUsers(limit, offset);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users);

        return response<AdminListUsersResponse>(res, {
            data: {
                users: allUsers,
                pagination: {
                    total: count,
                    limit,
                    offset
                }
            },
            success: true,
            error: false,
            message: "Users retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
