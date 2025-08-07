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

const updateRuleTemplateParamsSchema = z
    .object({
        orgId: z.string().min(1),
        templateId: z.string().min(1)
    })
    .strict();

const updateRuleTemplateBodySchema = z
    .object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional()
    })
    .strict();

export async function updateRuleTemplate(
    req: any,
    res: any,
    next: any
): Promise<any> {
    try {
        const parsedParams = updateRuleTemplateParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = updateRuleTemplateBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { orgId, templateId } = parsedParams.data;
        const { name, description } = parsedBody.data;

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

        // Check if another template with the same name already exists (excluding current template)
        const duplicateTemplate = await db
            .select()
            .from(ruleTemplates)
            .where(and(
                eq(ruleTemplates.orgId, orgId),
                eq(ruleTemplates.name, name),
                eq(ruleTemplates.templateId, templateId)
            ))
            .limit(1);

        if (duplicateTemplate.length > 0) {
            return next(
                createHttpError(
                    HttpCode.CONFLICT,
                    `Template with name "${name}" already exists`
                )
            );
        }

        // Update the template
        const [updatedTemplate] = await db
            .update(ruleTemplates)
            .set({
                name,
                description: description || null
            })
            .where(and(eq(ruleTemplates.orgId, orgId), eq(ruleTemplates.templateId, templateId)))
            .returning();

        return response(res, {
            data: updatedTemplate,
            success: true,
            error: false,
            message: "Rule template updated successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        console.error("Error updating rule template:", error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Internal server error"
            )
        );
    }
}
