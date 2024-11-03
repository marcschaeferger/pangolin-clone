import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const updateRoleParamsSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const updateRoleBodySchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

export async function updateRole(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = updateRoleParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = updateRoleBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { roleId } = parsedParams.data;
        const updateData = parsedBody.data;

        // Check if the user has permission to update roles
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.updateRole,
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

        const role = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, roleId))
            .limit(1);

        if (role.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Role with ID ${roleId} not found`
                )
            );
        }

        if (role[0].isSuperuserRole) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    `Cannot update a superuser role`
                )
            );
        }

        const updatedRole = await db
            .update(roles)
            .set(updateData)
            .where(eq(roles.roleId, roleId))
            .returning();

        if (updatedRole.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Role with ID ${roleId} not found`
                )
            );
        }

        return response(res, {
            data: updatedRole[0],
            success: true,
            error: false,
            message: "Role updated successfully",
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
