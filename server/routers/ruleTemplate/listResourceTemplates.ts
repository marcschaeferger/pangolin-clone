import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resourceTemplates, ruleTemplates, resources } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";

const listResourceTemplatesParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

export type ListResourceTemplatesResponse = {
    templates: Awaited<ReturnType<typeof queryResourceTemplates>>;
};

function queryResourceTemplates(resourceId: number) {
    return db
        .select({
            templateId: ruleTemplates.templateId,
            name: ruleTemplates.name,
            description: ruleTemplates.description,
            orgId: ruleTemplates.orgId,
            createdAt: ruleTemplates.createdAt
        })
        .from(resourceTemplates)
        .innerJoin(ruleTemplates, eq(resourceTemplates.templateId, ruleTemplates.templateId))
        .where(eq(resourceTemplates.resourceId, resourceId))
        .orderBy(ruleTemplates.createdAt);
}

registry.registerPath({
    method: "get",
    path: "/resource/{resourceId}/templates",
    description: "List templates assigned to a resource.",
    tags: [OpenAPITags.Resource, OpenAPITags.RuleTemplate],
    request: {
        params: listResourceTemplatesParamsSchema
    },
    responses: {}
});

export async function listResourceTemplates(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = listResourceTemplatesParamsSchema.safeParse(
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
        const { resourceId } = parsedParams.data;

        // Verify the resource exists
        const [resource] = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

        if (!resource) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        const templatesList = await queryResourceTemplates(resourceId);

        return response<ListResourceTemplatesResponse>(res, {
            data: {
                templates: templatesList
            },
            success: true,
            error: false,
            message: "Resource templates retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
