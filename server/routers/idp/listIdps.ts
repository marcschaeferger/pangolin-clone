import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { domains, idp, orgDomains, users, idpOrg } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { sql } from "drizzle-orm";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";

const querySchema = z
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

async function query(limit: number, offset: number) {
    const res = await db
        .select({
            idpId: idp.idpId,
            name: idp.name,
            type: idp.type,
            orgCount: sql<number>`count(${idpOrg.orgId})`
        })
        .from(idp)
        .leftJoin(idpOrg, sql`${idp.idpId} = ${idpOrg.idpId}`)
        .groupBy(idp.idpId)
        .limit(limit)
        .offset(offset);
    return res;
}

export type ListIdpsResponse = {
    idps: Array<{
        idpId: number;
        name: string;
        type: string;
        orgCount: number;
    }>;
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
};

registry.registerPath({
    method: "get",
    path: "/idp",
    description: "List all IDP in the system.",
    tags: [OpenAPITags.Idp],
    request: {
        query: querySchema
    },
    responses: {}
});

export async function listIdps(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = querySchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedQuery.error).toString()
                )
            );
        }
        const { limit, offset } = parsedQuery.data;

        const list = await query(limit, offset);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(idp);

        return response<ListIdpsResponse>(res, {
            data: {
                idps: list,
                pagination: {
                    total: count,
                    limit,
                    offset
                }
            },
            success: true,
            error: false,
            message: "Idps retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
