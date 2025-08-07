import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resourceTemplates, resources, resourceRules, templateRules } from "@server/db";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";

const unassignTemplateFromResourceParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive()),
        templateId: z.string().min(1)
    })
    .strict();

registry.registerPath({
    method: "delete",
    path: "/resource/{resourceId}/templates/{templateId}",
    description: "Unassign a template from a resource.",
    tags: [OpenAPITags.Resource, OpenAPITags.RuleTemplate],
    request: {
        params: unassignTemplateFromResourceParamsSchema
    },
    responses: {}
});

export async function unassignTemplateFromResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = unassignTemplateFromResourceParamsSchema.safeParse(
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

        const { resourceId, templateId } = parsedParams.data;

        // Verify that the referenced resource exists
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

        // Check if the template is assigned to this resource
        const [existingAssignment] = await db
            .select()
            .from(resourceTemplates)
            .where(and(eq(resourceTemplates.resourceId, resourceId), eq(resourceTemplates.templateId, templateId)))
            .limit(1);

        if (!existingAssignment) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Template ${templateId} is not assigned to resource ${resourceId}`
                )
            );
        }

        // Remove the template assignment
        await db
            .delete(resourceTemplates)
            .where(and(eq(resourceTemplates.resourceId, resourceId), eq(resourceTemplates.templateId, templateId)));

        // Remove all resource rules that were created from this template
        // We can now use the templateRuleId to precisely identify which rules to remove
        try {
            // Get all template rules for this template
            const templateRulesList = await db
                .select()
                .from(templateRules)
                .where(eq(templateRules.templateId, templateId))
                .orderBy(templateRules.priority);

            if (templateRulesList.length > 0) {
                // Remove resource rules that have templateRuleId matching any of the template rules
                for (const templateRule of templateRulesList) {
                    await db
                        .delete(resourceRules)
                        .where(and(
                            eq(resourceRules.resourceId, resourceId),
                            eq(resourceRules.templateRuleId, templateRule.ruleId)
                        ));
                }
            }
        } catch (error) {
            logger.error("Error removing template rules during unassignment:", error);
            // Don't fail the unassignment if rule removal fails, just log it
        }

        return response(res, {
            data: { resourceId, templateId },
            success: true,
            error: false,
            message: "Template unassigned from resource successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
