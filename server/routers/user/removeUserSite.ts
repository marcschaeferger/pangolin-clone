import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resources, userResources, userSites } from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const removeUserSiteParamsSchema = z.object({
    userId: z.string(),
});

const removeUserSiteSchema = z.object({
    siteId: z.number().int().positive(),
});

export async function removeUserSite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = removeUserSiteParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { userId } = parsedParams.data;

        const parsedBody = removeUserSiteSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { siteId } = parsedBody.data;

        // Check if the user has permission to remove user sites
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.removeUserSite,
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

        const deletedUserSite = await db
            .delete(userSites)
            .where(
                and(eq(userSites.userId, userId), eq(userSites.siteId, siteId))
            )
            .returning();

        if (deletedUserSite.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Site with ID ${siteId} not found for user with ID ${userId}`
                )
            );
        }

        const siteResources = await db
            .select()
            .from(resources)
            .where(eq(resources.siteId, siteId));

        for (const resource of siteResources) {
            await db
                .delete(userResources)
                .where(
                    and(
                        eq(userResources.userId, userId),
                        eq(userResources.resourceId, resource.resourceId)
                    )
                )
                .returning();
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Site removed from user successfully",
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
