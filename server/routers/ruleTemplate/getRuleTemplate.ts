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

const getRuleTemplateParamsSchema = z
    .object({
        orgId: z.string().min(1),
        templateId: z.string().min(1)
    })
    .strict();

export async function getRuleTemplate(
    req: any,
    res: any,
    next: any
): Promise<any> {
    try {
        const parsedParams = getRuleTemplateParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId, templateId } = parsedParams.data;

        // Get the template
        const template = await db
            .select()
            .from(ruleTemplates)
            .where(and(eq(ruleTemplates.orgId, orgId), eq(ruleTemplates.templateId, templateId)))
            .limit(1);

        if (template.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "Rule template not found"
                )
            );
        }

        return response(res, {
            data: template[0],
            success: true,
            error: false,
            message: "Rule template retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        console.error("Error getting rule template:", error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Internal server error"
            )
        );
    }
}
