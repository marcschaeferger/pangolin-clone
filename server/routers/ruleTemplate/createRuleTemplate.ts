import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { ruleTemplates } from "@server/db";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";
import { generateId } from "@server/auth/sessions/app";

const createRuleTemplateParamsSchema = z
    .object({
        orgId: z.string().min(1)
    })
    .strict();

const createRuleTemplateBodySchema = z
    .object({
        name: z.string().min(1).max(100).refine(name => name.trim().length > 0, {
            message: "Template name cannot be empty or just whitespace"
        }),
        description: z.string().max(500).optional()
    })
    .strict();

registry.registerPath({
    method: "post",
    path: "/org/{orgId}/rule-templates",
    description: "Create a rule template.",
    tags: [OpenAPITags.Org, OpenAPITags.RuleTemplate],
    request: {
        params: createRuleTemplateParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: createRuleTemplateBodySchema
                }
            }
        }
    },
    responses: {}
});

export async function createRuleTemplate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = createRuleTemplateParamsSchema.safeParse(
            req.params
        );
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = createRuleTemplateBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { orgId } = parsedParams.data;
        const { name, description } = parsedBody.data;

        // Check if template with same name already exists
        const existingTemplate = await db
            .select()
            .from(ruleTemplates)
            .where(and(eq(ruleTemplates.orgId, orgId), eq(ruleTemplates.name, name)))
            .limit(1);

        if (existingTemplate.length > 0) {
            return next(
                createHttpError(
                    HttpCode.CONFLICT,
                    `A template with the name "${name}" already exists in this organization`
                )
            );
        }

        const templateId = generateId(15);
        const createdAt = Date.now();

        const [newTemplate] = await db
            .insert(ruleTemplates)
            .values({
                templateId,
                orgId,
                name,
                description: description || null,
                createdAt
            })
            .returning();

        return response(res, {
            data: newTemplate,
            success: true,
            error: false,
            message: "Rule template created successfully",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
