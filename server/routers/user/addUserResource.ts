import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { userResources } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const addUserResourceSchema = z.object({
    userId: z.string(),
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function addUserResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = addUserResourceSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { userId, resourceId } = parsedBody.data;

        // Check if the user has permission to add user resources
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.addUserResource,
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

        const newUserResource = await db
            .insert(userResources)
            .values({
                userId,
                resourceId,
            })
            .returning();

        return response(res, {
            data: newUserResource[0],
            success: true,
            error: false,
            message: "Resource added to user successfully",
            status: HttpCode.CREATED,
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
