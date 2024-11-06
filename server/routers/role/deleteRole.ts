import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const deleteRoleSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function deleteRole(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = deleteRoleSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { roleId } = parsedParams.data;

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

        if (role[0].isAdmin) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    `Cannot delete a Admin role`
                )
            );
        }

        const deletedRole = await db
            .delete(roles)
            .where(eq(roles.roleId, roleId))
            .returning();

        if (deletedRole.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Role with ID ${roleId} not found`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Role deleted successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
