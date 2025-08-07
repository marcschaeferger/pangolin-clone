import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { templateRules, ruleTemplates } from "@server/db";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const deleteTemplateRuleParamsSchema = z
    .object({
        orgId: z.string().min(1),
        templateId: z.string().min(1),
        ruleId: z.string().min(1)
    })
    .strict();

export async function deleteTemplateRule(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = deleteTemplateRuleParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId, templateId, ruleId } = parsedParams.data;

        // Check if template exists and belongs to the organization
        const existingTemplate = await db
            .select()
            .from(ruleTemplates)
            .where(and(eq(ruleTemplates.orgId, orgId), eq(ruleTemplates.templateId, templateId)))
            .limit(1);

        if (existingTemplate.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "Rule template not found"
                )
            );
        }

        // Check if rule exists and belongs to the template
        const existingRule = await db
            .select()
            .from(templateRules)
            .where(and(eq(templateRules.templateId, templateId), eq(templateRules.ruleId, parseInt(ruleId))))
            .limit(1);

        if (existingRule.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "Template rule not found"
                )
            );
        }

        // Count affected resources for the response message
        let affectedResourcesCount = 0;
        try {
            const { resourceRules } = await import("@server/db");
            
            // Get affected resource rules before deletion for counting
            const affectedResourceRules = await db
                .select()
                .from(resourceRules)
                .where(eq(resourceRules.templateRuleId, parseInt(ruleId)));
            
            affectedResourcesCount = affectedResourceRules.length;

            // Delete the resource rules first (due to foreign key constraint)
            await db
                .delete(resourceRules)
                .where(eq(resourceRules.templateRuleId, parseInt(ruleId)));
        } catch (error) {
            logger.error("Error deleting resource rules created from template rule:", error);
            // Don't fail the template rule deletion if resource rule deletion fails, just log it
        }

        // Delete the template rule after resource rules are deleted
        await db
            .delete(templateRules)
            .where(and(eq(templateRules.templateId, templateId), eq(templateRules.ruleId, parseInt(ruleId))));

        const message = affectedResourcesCount > 0 
            ? `Template rule deleted successfully. Removed from ${affectedResourcesCount} assigned resource${affectedResourcesCount > 1 ? 's' : ''}.`
            : "Template rule deleted successfully.";

        return response(res, {
            data: null,
            success: true,
            error: false,
            message,
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
