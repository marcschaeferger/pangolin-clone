import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { Org, orgs, userOrgs } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { sql, inArray, eq } from "drizzle-orm";
import logger from "@server/logger";
import { fromZodError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";

const listOrgsParamsSchema = z.object({
    userId: z.string()
});

const listOrgsSchema = z.object({
    limit: z
        .string()
        .optional()
        .default("1000")
        .transform(Number)
        .pipe(z.number().int().positive()),
    offset: z
        .string()
        .optional()
        .default("0")
        .transform(Number)
        .pipe(z.number().int().nonnegative())
});

// registry.registerPath({
//     method: "get",
//     path: "/user/{userId}/orgs",
//     description: "List all organizations for a user.",
//     tags: [OpenAPITags.Org, OpenAPITags.User],
//     request: {
//         query: listOrgsSchema
//     },
//     responses: {}
// });

export type ListUserOrgsResponse = {
    orgs: Org[];
    pagination: { total: number; limit: number; offset: number };
};

export async function listUserOrgs(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = listOrgsSchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromZodError(parsedQuery.error)
                )
            );
        }

        const { limit, offset } = parsedQuery.data;

        const parsedParams = listOrgsParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromZodError(parsedParams.error)
                )
            );
        }

        const { userId } = parsedParams.data;

        const userOrganizations = await db
            .select({
                orgId: userOrgs.orgId,
                roleId: userOrgs.roleId
            })
            .from(userOrgs)
            .where(eq(userOrgs.userId, userId));

        const userOrgIds = userOrganizations.map((org) => org.orgId);

        if (!userOrgIds || userOrgIds.length === 0) {
            return response<ListUserOrgsResponse>(res, {
                data: {
                    orgs: [],
                    pagination: {
                        total: 0,
                        limit,
                        offset
                    }
                },
                success: true,
                error: false,
                message: "No organizations found for the user",
                status: HttpCode.OK
            });
        }

        const organizations = await db
            .select()
            .from(orgs)
            .where(inArray(orgs.orgId, userOrgIds))
            .limit(limit)
            .offset(offset);

        const totalCountResult = await db
            .select({ count: sql<number>`cast(count(*) as integer)` })
            .from(orgs)
            .where(inArray(orgs.orgId, userOrgIds));
        const totalCount = totalCountResult[0].count;

        return response<ListUserOrgsResponse>(res, {
            data: {
                orgs: organizations,
                pagination: {
                    total: totalCount,
                    limit,
                    offset
                }
            },
            success: true,
            error: false,
            message: "Organizations retrieved successfully",
            status: HttpCode.OK
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
