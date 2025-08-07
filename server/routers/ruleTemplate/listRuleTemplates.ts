import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { ruleTemplates } from "@server/db";
import { eq, sql } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";

const listRuleTemplatesParamsSchema = z
    .object({
        orgId: z.string().min(1)
    })
    .strict();

const listRuleTemplatesQuerySchema = z.object({
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

export type ListRuleTemplatesResponse = {
    templates: Awaited<ReturnType<typeof queryRuleTemplates>>;
    pagination: { total: number; limit: number; offset: number };
};

function queryRuleTemplates(orgId: string) {
    return db
        .select({
            templateId: ruleTemplates.templateId,
            orgId: ruleTemplates.orgId,
            name: ruleTemplates.name,
            description: ruleTemplates.description,
            createdAt: ruleTemplates.createdAt
        })
        .from(ruleTemplates)
        .where(eq(ruleTemplates.orgId, orgId))
        .orderBy(ruleTemplates.createdAt);
}

registry.registerPath({
    method: "get",
    path: "/org/{orgId}/rule-templates",
    description: "List rule templates for an organization.",
    tags: [OpenAPITags.Org, OpenAPITags.RuleTemplate],
    request: {
        params: listRuleTemplatesParamsSchema,
        query: listRuleTemplatesQuerySchema
    },
    responses: {}
});

export async function listRuleTemplates(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = listRuleTemplatesQuerySchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedQuery.error)
                )
            );
        }
        const { limit, offset } = parsedQuery.data;

        const parsedParams = listRuleTemplatesParamsSchema.safeParse(
            req.params
        );
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error)
                )
            );
        }
        const { orgId } = parsedParams.data;

        const baseQuery = queryRuleTemplates(orgId);

        let templatesList = await baseQuery.limit(limit).offset(offset);

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`cast(count(*) as integer)` })
            .from(ruleTemplates)
            .where(eq(ruleTemplates.orgId, orgId));
        
        const totalCount = Number(countResult[0]?.count || 0);

        return response<ListRuleTemplatesResponse>(res, {
            data: {
                templates: templatesList,
                pagination: {
                    total: totalCount,
                    limit,
                    offset
                }
            },
            success: true,
            error: false,
            message: "Rule templates retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
