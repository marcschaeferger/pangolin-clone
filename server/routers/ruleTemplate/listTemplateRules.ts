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

const listTemplateRulesParamsSchema = z
    .object({
        orgId: z.string().min(1),
        templateId: z.string().min(1)
    })
    .strict();

export async function listTemplateRules(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = listTemplateRulesParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId, templateId } = parsedParams.data;

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

        // Get template rules
        const rules = await db
            .select()
            .from(templateRules)
            .where(eq(templateRules.templateId, templateId))
            .orderBy(templateRules.priority);

        return response(res, {
            data: { rules },
            success: true,
            error: false,
            message: "Template rules retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
