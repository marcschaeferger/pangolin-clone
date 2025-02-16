import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { domains, orgDomains, users } from "@server/db/schema";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { eq, sql } from "drizzle-orm";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const listDomainsParamsSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

const listDomainsSchema = z
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

async function queryDomains(orgId: string, limit: number, offset: number) {
    return await db
        .select({
            domainId: domains.domainId,
            baseDomain: domains.baseDomain
        })
        .from(orgDomains)
        .where(eq(orgDomains.orgId, orgId))
        .leftJoin(domains, eq(domains.domainId, orgDomains.domainId))
        .limit(limit)
        .offset(offset);
}

export type ListDomainsResponse = {
    domains: NonNullable<Awaited<ReturnType<typeof queryDomains>>>;
    pagination: { total: number; limit: number; offset: number };
};

export async function listDomains(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = listDomainsSchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedQuery.error).toString()
                )
            );
        }
        const { limit, offset } = parsedQuery.data;

        const parsedParams = listDomainsParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId } = parsedParams.data;

        const domains = await queryDomains(orgId.toString(), limit, offset);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users);

        return response<ListDomainsResponse>(res, {
            data: {
                domains,
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
