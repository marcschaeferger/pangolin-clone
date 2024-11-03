import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roleResources, roles } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const listResourceRolesSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function listResourceRoles(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = listResourceRolesSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;

        // Check if the user has permission to list resource roles
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.listResourceRoles,
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

        const resourceRolesList = await db
            .select({
                roleId: roles.roleId,
                name: roles.name,
                description: roles.description,
                isSuperuserRole: roles.isSuperuserRole,
            })
            .from(roleResources)
            .innerJoin(roles, eq(roleResources.roleId, roles.roleId))
            .where(eq(roleResources.resourceId, resourceId));

        return response(res, {
            data: resourceRolesList,
            success: true,
            error: false,
            message: "Resource roles retrieved successfully",
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
