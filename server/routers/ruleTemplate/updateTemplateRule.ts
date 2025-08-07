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
import { isValidCIDR, isValidIP, isValidUrlGlobPattern } from "@server/lib/validators";

const updateTemplateRuleParamsSchema = z
    .object({
        orgId: z.string().min(1),
        templateId: z.string().min(1),
        ruleId: z.string().min(1)
    })
    .strict();

const updateTemplateRuleBodySchema = z
    .object({
        action: z.enum(["ACCEPT", "DROP"]).optional(),
        match: z.enum(["CIDR", "IP", "PATH"]).optional(),
        value: z.string().min(1).optional(),
        priority: z.number().int().optional(),
        enabled: z.boolean().optional()
    })
    .strict();

export async function updateTemplateRule(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = updateTemplateRuleParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = updateTemplateRuleBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { orgId, templateId, ruleId } = parsedParams.data;
        const updateData = parsedBody.data;

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

        // Validate the value if it's being updated
        if (updateData.value && updateData.match) {
            if (updateData.match === "CIDR" && !isValidCIDR(updateData.value)) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Invalid CIDR format"
                    )
                );
            }
            if (updateData.match === "IP" && !isValidIP(updateData.value)) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Invalid IP address format"
                    )
                );
            }
            if (updateData.match === "PATH" && !isValidUrlGlobPattern(updateData.value)) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Invalid URL pattern format"
                    )
                );
            }
        }

        // Update the rule
        const [updatedRule] = await db
            .update(templateRules)
            .set(updateData)
            .where(and(eq(templateRules.templateId, templateId), eq(templateRules.ruleId, parseInt(ruleId))))
            .returning();

        // Propagate changes to all resource rules created from this template rule
        try {
            const { resourceRules } = await import("@server/db");
            
            // Find all resource rules that were created from this template rule
            const affectedResourceRules = await db
                .select()
                .from(resourceRules)
                .where(eq(resourceRules.templateRuleId, parseInt(ruleId)));

            if (affectedResourceRules.length > 0) {
                // Update all affected resource rules with the same changes
                // Note: We don't update priority as that should remain independent
                const propagationData = {
                    ...updateData,
                    priority: undefined // Don't propagate priority changes
                };
                
                // Remove undefined values
                Object.keys(propagationData).forEach(key => {
                    if (propagationData[key] === undefined) {
                        delete propagationData[key];
                    }
                });

                if (Object.keys(propagationData).length > 0) {
                    await db
                        .update(resourceRules)
                        .set(propagationData)
                        .where(eq(resourceRules.templateRuleId, parseInt(ruleId)));
                }
            }
        } catch (error) {
            logger.error("Error propagating template rule changes to resource rules:", error);
            // Don't fail the template rule update if propagation fails, just log it
        }

        return response(res, {
            data: updatedRule,
            success: true,
            error: false,
            message: "Template rule updated successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
