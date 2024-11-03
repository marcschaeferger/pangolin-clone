import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resources, roleResources, roleSites } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { eq } from "drizzle-orm";
import { fromError } from "zod-validation-error";

const addRoleSiteParamsSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const addRoleSiteSchema = z.object({
    siteId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function addRoleSite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = addRoleSiteSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { siteId } = parsedBody.data;

        const parsedParams = addRoleSiteParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { roleId } = parsedParams.data;

        // Check if the user has permission to add role sites
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.addRoleSite,
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

        const newRoleSite = await db
            .insert(roleSites)
            .values({
                roleId,
                siteId,
            })
            .returning();

        const siteResources = await db
            .select()
            .from(resources)
            .where(eq(resources.siteId, siteId));

        for (const resource of siteResources) {
            await db.insert(roleResources).values({
                roleId,
                resourceId: resource.resourceId,
            });
        }

        return response(res, {
            data: newRoleSite[0],
            success: true,
            error: false,
            message: "Site added to role successfully",
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
