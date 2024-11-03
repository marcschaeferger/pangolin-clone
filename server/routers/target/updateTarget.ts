import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { targets } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const updateTargetParamsSchema = z.object({
    targetId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const updateTargetBodySchema = z
    .object({
        // ip: z.string().ip().optional(), // for now we cant update the ip; you will have to delete
        method: z.string().min(1).max(10).optional(),
        port: z.number().int().min(1).max(65535).optional(),
        protocol: z.string().optional(),
        enabled: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

export async function updateTarget(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = updateTargetParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = updateTargetBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { targetId } = parsedParams.data;
        const updateData = parsedBody.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.updateTarget,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission to perform this action"
                )
            );
        }

        const updatedTarget = await db
            .update(targets)
            .set(updateData)
            .where(eq(targets.targetId, targetId))
            .returning();

        if (updatedTarget.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Target with ID ${targetId} not found`
                )
            );
        }

        return response(res, {
            data: updatedTarget[0],
            success: true,
            error: false,
            message: "Target updated successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
}
