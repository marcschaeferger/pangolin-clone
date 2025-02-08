import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resourceRules, resources } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const createResourceRuleSchema = z
    .object({
        resourceId: z.number().int().positive(),
        action: z.enum(["ACCEPT", "DROP"]),
        match: z.enum(["CIDR", "PATH"]),
        value: z.string().min(1)
    })
    .strict();

export async function createResourceRule(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = createResourceRuleSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { resourceId, action, match, value } = parsedBody.data;

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

        // Create the new resource rule
        const [newRule] = await db
            .insert(resourceRules)
            .values({
                resourceId,
                action,
                match,
                value
            })
            .returning();

        return response(res, {
            data: newRule,
            success: true,
            error: false,
            message: "Resource rule created successfully",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}