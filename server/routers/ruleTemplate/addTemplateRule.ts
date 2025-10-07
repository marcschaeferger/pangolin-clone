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

const addTemplateRuleParamsSchema = z
    .object({
        orgId: z.string().min(1),
        templateId: z.string().min(1)
    })
    .strict();

const addTemplateRuleBodySchema = z
    .object({
        action: z.enum(["ACCEPT", "DROP"]),
        match: z.enum(["CIDR", "IP", "PATH"]),
        value: z.string().min(1),
        priority: z.number().int().optional(),
        enabled: z.boolean().optional()
    })
    .strict();

export async function addTemplateRule(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = addTemplateRuleParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = addTemplateRuleBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { orgId, templateId } = parsedParams.data;
        const { action, match, value, priority, enabled = true } = parsedBody.data;

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

        // Validate the value based on match type
        if (match === "CIDR" && !isValidCIDR(value)) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid CIDR format"
                )
            );
        }
        if (match === "IP" && !isValidIP(value)) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid IP address format"
                )
            );
        }
        if (match === "PATH" && !isValidUrlGlobPattern(value)) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid URL pattern format"
                )
            );
        }

        // Check for duplicate rule
        const existingRule = await db
            .select()
            .from(templateRules)
            .where(and(
                eq(templateRules.templateId, templateId),
                eq(templateRules.action, action),
                eq(templateRules.match, match),
                eq(templateRules.value, value)
            ))
            .limit(1);

        if (existingRule.length > 0) {
            return next(
                createHttpError(
                    HttpCode.CONFLICT,
                    "Rule already exists"
                )
            );
        }

        // Determine priority if not provided
        let finalPriority = priority;
        if (finalPriority === undefined) {
            const maxPriority = await db
                .select({ maxPriority: templateRules.priority })
                .from(templateRules)
                .where(eq(templateRules.templateId, templateId))
                .orderBy(templateRules.priority)
                .limit(1);

            finalPriority = (maxPriority[0]?.maxPriority || 0) + 1;
        }

        // Add the rule
        const [newRule] = await db
            .insert(templateRules)
            .values({
                templateId,
                action,
                match,
                value,
                priority: finalPriority,
                enabled
            })
            .returning();

        return response(res, {
            data: newRule,
            success: true,
            error: false,
            message: "Template rule added successfully",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
